# ZeroInbox  
ZeroInbox helps you clean, organize, and take control of your email inbox by analyzing and structuring your emails efficiently.

Just connect your email, and ZeroInbox will help you declutter, categorize, and focus only on what matters.

## Features  

- **Brand-wise Email Segregation** – Automatically groups emails based on brands/senders for a cleaner inbox.  
- **Bulk Unsubscribe & Archive** – Unsubscribe or archive multiple emails at once to quickly remove clutter.  
- **Weekly Email Rollups** – Receive a consolidated weekly summary of emails from selected brands.  
- **Smart Label Routing** – Once a brand is assigned to a label, all future emails from that brand are automatically routed there.  
- **Secure Authentication** – Uses OAuth-based login to safely connect your email account.  


##  Usage  

1. Log in using your email account  
2. Connect your inbox  
3. Let ZeroInbox fetch and analyze your emails  
4. View categorized and summarized emails  
5. Take actions like reading, filtering, or organizing  


## Tech Stack  

### Backend  
- [Supabase](https://supabase.com/) – Backend services and database management  
- [Google APIs](https://developers.google.com/) – Gmail integration  
- [Microsoft Graph API](https://developer.microsoft.com/en-us/graph/) – Outlook email integration  

### Frontend  
- [Next.js](https://nextjs.org/) – Full-stack React framework  
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first styling  
- [shadcn/ui](https://ui.shadcn.com/) – Reusable UI components  
- [tsParticles](https://particles.js.org/) – Interactive background effects    

### Deployment  
- [Vercel](https://vercel.com/) – Frontend hosting and deployment    


## App Preview  

<img width="1919" height="897" alt="Screenshot 2026-03-24 195529" src="https://github.com/user-attachments/assets/b6f6922b-5271-4fcc-9e4b-41af853e17ce" />
<img width="1896" height="897" alt="Screenshot 2026-03-24 192114" src="https://github.com/user-attachments/assets/4535c6d4-a22c-4657-8c06-64902be1466f" />
<img width="1894" height="893" alt="Screenshot 2026-03-24 192310" src="https://github.com/user-attachments/assets/b09605eb-ee76-4855-91d5-c48f5ab08f3c" />
<img width="1894" height="897" alt="Screenshot 2026-03-24 193043" src="https://github.com/user-attachments/assets/50692468-07a6-43d7-b84a-44b6c2e7470f" />


##  Installation & Setup  
1. Clone the repository:
```bash
git clone https://github.com/SabarishSriram/ZeroInbox.git
cd zeroinbox
```
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables in a .env file:
```env
NEXT_PUBLIC_SUPABASE_URL =  <URL of your Supabase project >
NEXT_PUBLIC_SUPABASE_ANON_KEY =  <Anonymous key for connecting to Supabase client>
NEXT_PUBLIC_GOOGLE_CLIENT_ID =  <OAuth client ID for Google login>
GOOGLE_CLIENT_SECRET =  <OAuth client secret for Google login >
NEXT_PUBLIC_GMAIL_SCOPES =  <Gmail API scopes required for reading/sending emails>
NEXT_PUBLIC_REDIRECT_URI =  <Redirect URL for OAuth after successful login>
```
4.Start the server:
```bash
npm run dev
```

