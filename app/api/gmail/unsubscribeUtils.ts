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
export async function processExistingEmails(
  gmail: any,
  domain: string,
  action: "trash" | "delete"
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Search for all messages from the domain
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `from:${domain}`,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return {
        success: false,
        error: `No emails found from domain: ${domain}. Please check if the domain is correct.`,
      };
    }

    const messageIds = messages.map((msg: any) => msg.id);
    console.log(`Found ${messageIds.length} messages to process`);

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
      // Permanently delete - process in batches of 100 to avoid rate limits
      const batchSize = 100;
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        console.log(
          `Processing batch ${i / batchSize + 1} of ${Math.ceil(
            messageIds.length / batchSize
          )}`
        );

        try {
          // First move to trash
          await gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: batch,
              addLabelIds: ["TRASH"],
              removeLabelIds: ["INBOX"],
            },
          });

          // Then permanently delete
          await gmail.users.messages.batchDelete({
            userId: "me",
            requestBody: {
              ids: batch,
            },
          });
        } catch (batchError: any) {
          console.error(
            `Error processing batch ${i / batchSize + 1}:`,
            batchError
          );
          if (batchError.response?.data?.error) {
            console.error("API Error details:", batchError.response.data.error);
            return {
              success: false,
              error: `Failed to process batch of emails: ${
                batchError.response.data.error.message || "Unknown error"
              }`,
            };
          }
          throw batchError;
        }
      }
    }

    return {
      success: true,
      message: `Successfully processed ${messageIds.length} emails from ${domain}`,
    };
  } catch (error: any) {
    console.error("Error processing existing emails:", error);
    if (error.response?.data?.error) {
      console.error("API Error details:", error.response.data.error);
      const errorMessage = error.response.data.error.message || "Unknown error";

      // Handle specific error cases
      if (errorMessage.includes("insufficient authentication scopes")) {
        return {
          success: false,
          error:
            "Insufficient permissions to perform this action. Please check your Gmail API scopes.",
        };
      }

      if (errorMessage.includes("Invalid query")) {
        return {
          success: false,
          error: `Invalid domain format: ${domain}. Please check the domain and try again.`,
        };
      }

      return {
        success: false,
        error: `Gmail API Error: ${errorMessage}`,
      };
    }

    if (error.response?.status === 403) {
      return {
        success: false,
        error:
          "Insufficient permissions to perform this action. Please check your Gmail API scopes.",
      };
    }

    if (error.response?.status === 404) {
      return {
        success: false,
        error: `Domain not found: ${domain}. Please check if the domain is correct.`,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while processing emails.",
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
    // Step 1: Process existing emails (trash or delete them)
    const existingResult = await processExistingEmails(gmail, domain, action);
    if (!existingResult.success) {
      return existingResult;
    }

    // ✅ Only create filter and store unsubscribe info if action is "trash"
    if (action === "trash") {
      // Step 2: Create Gmail filter for future emails
      const filterResult = await createGmailFilter(gmail, domain, action);
      if (!filterResult.success) {
        return filterResult;
      }

      // Step 3: Store unsubscribe info
      await storeUnsubscribeInfo(
        createClient(cookies()),
        domain,
        action,
        filterResult.filterId!
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error in handleUnsubscribe:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
