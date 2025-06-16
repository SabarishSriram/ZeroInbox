import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface UnsubscribeInfo {
  unsubscribeUrl?: string;
  unsubscribeEmail?: string;
}

interface UnsubscribeAction {
  domain: string;
  action: "trash" | "delete";
  userId: string;
}

/**
 * Parses the List-Unsubscribe header to extract unsubscribe URLs and email addresses
 */
export function parseListUnsubscribeHeader(header: string): UnsubscribeInfo {
  if (!header) return {};

  const info: UnsubscribeInfo = {};

  // Split by commas and trim each part
  const parts = header.split(",").map((part) => part.trim());

  for (const part of parts) {
    // Extract mailto: links
    const mailtoMatch = part.match(/<mailto:([^>]+)>/);
    if (mailtoMatch) {
      info.unsubscribeEmail = mailtoMatch[1];
    }

    // Extract https: links
    const httpsMatch = part.match(/<https?:\/\/[^>]+>/);
    if (httpsMatch) {
      info.unsubscribeUrl = httpsMatch[0].slice(1, -1); // Remove < and >
    }
  }

  return info;
}

/**
 * Updates the unsubscribe information for a specific domain in the email_stats table
 */
export async function updateUnsubscribeInfoForDomain(
  domain: string,
  header: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(cookies());

    // Parse the unsubscribe header
    const unsubscribeInfo = parseListUnsubscribeHeader(header);

    // Update the record in Supabase
    const { error } = await supabase
      .from("email_stats")
      .update({
        unsubscribe_url: unsubscribeInfo.unsubscribeUrl || null,
        unsubscribe_email: unsubscribeInfo.unsubscribeEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("domain", domain);

    if (error) {
      console.error("Error updating unsubscribe info:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateUnsubscribeInfoForDomain:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Process existing emails from a domain
 */
async function processExistingEmails(
  gmail: any,
  domain: string,
  action: "trash" | "delete"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Search for all messages from the domain
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `from:${domain}`,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return { success: true };
    }

    const messageIds = messages.map((msg: any) => msg.id);

    if (action === "trash") {
      // Move to trash
      await gmail.users.messages.batchModify({
        userId: "me",
        requestBody: {
          ids: messageIds,
          addLabelIds: ["TRASH"],
          removeLabelIds: ["INBOX"],
        },
      });
    } else {
      // Permanently delete
      await gmail.users.messages.batchDelete({
        userId: "me",
        requestBody: {
          ids: messageIds,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing existing emails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Create a Gmail filter for future emails
 */
async function createGmailFilter(
  gmail: any,
  domain: string,
  action: "trash" | "delete"
): Promise<{ success: boolean; filterId?: string; error?: string }> {
  try {
    if (action === "trash") {
      // Create a filter to move future emails to trash
      const response = await gmail.users.settings.filters.create({
        userId: "me",
        requestBody: {
          criteria: {
            from: domain,
          },
          action: {
            removeLabelIds: ["INBOX"],
            addLabelIds: ["TRASH"],
          },
        },
      });

      return { success: true, filterId: response.data.id };
    } else {
      // For delete action, create a filter to label future emails
      const response = await gmail.users.settings.filters.create({
        userId: "me",
        requestBody: {
          criteria: {
            from: domain,
          },
          action: {
            addLabelIds: ["TO_DELETE"],
          },
        },
      });

      return { success: true, filterId: response.data.id };
    }
  } catch (error) {
    console.error("Error creating Gmail filter:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Store unsubscribe information in Supabase
 */
async function storeUnsubscribeInfo(
  supabase: any,
  domain: string,
  action: "trash" | "delete",
  gmailFilterId: string
) {
  const { error } = await supabase.from("unsubscribed_domains").upsert({
    domain,
    action,
    gmail_filter_id: gmailFilterId,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Error storing unsubscribe info: ${JSON.stringify(error)}`);
  }
}

/**
 * Main function to handle unsubscribe process
 */
export async function handleUnsubscribe(
  gmail: any,
  { domain, action, userId }: UnsubscribeAction
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Process existing emails
    const existingResult = await processExistingEmails(gmail, domain, action);
    if (!existingResult.success) {
      return existingResult;
    }

    // Step 2: Create Gmail filter for future emails
    const filterResult = await createGmailFilter(gmail, domain, action);
    if (!filterResult.success) {
      return filterResult;
    }

    // Step 3: Store unsubscribe information
    await storeUnsubscribeInfo(
      createClient(cookies()),
      domain,
      action,
      filterResult.filterId!
    );

    return { success: true };
  } catch (error) {
    console.error("Error in handleUnsubscribe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
