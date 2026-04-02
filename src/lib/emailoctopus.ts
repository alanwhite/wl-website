const API_KEY = process.env.EMAILOCTOPUS_API_KEY;
const LIST_ID = process.env.EMAILOCTOPUS_LIST_ID;
const BASE_URL = "https://emailoctopus.com/api/1.6";

export function isNewsletterEnabled(): boolean {
  return !!API_KEY && !!LIST_ID;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("EmailOctopus API error:", data);
    throw new Error(data?.error?.message ?? `EmailOctopus API error: ${res.status}`);
  }
  return data;
}

export async function subscribeContact(email: string, name?: string | null) {
  if (!isNewsletterEnabled()) return;
  try {
    await api(`/lists/${LIST_ID}/contacts`, {
      method: "POST",
      body: JSON.stringify({
        api_key: API_KEY,
        email_address: email,
        fields: { FirstName: name ?? "" },
        status: "SUBSCRIBED",
      }),
    });
  } catch (e: any) {
    // Ignore "already subscribed" errors
    if (e.message?.includes("MEMBER_EXISTS_WITH_EMAIL_ADDRESS")) return;
    throw e;
  }
}

export async function unsubscribeContact(email: string) {
  if (!isNewsletterEnabled()) return;
  // EmailOctopus requires the contact ID to update status.
  // Find the contact first, then update.
  try {
    const contact = await findContact(email);
    if (!contact) return;

    await api(`/lists/${LIST_ID}/contacts/${contact.id}`, {
      method: "PUT",
      body: JSON.stringify({
        api_key: API_KEY,
        status: "UNSUBSCRIBED",
      }),
    });
  } catch (e) {
    console.error("Failed to unsubscribe contact:", e);
  }
}

export async function deleteContact(email: string) {
  if (!isNewsletterEnabled()) return;
  try {
    const contact = await findContact(email);
    if (!contact) return;

    await api(`/lists/${LIST_ID}/contacts/${contact.id}`, {
      method: "DELETE",
      body: JSON.stringify({ api_key: API_KEY }),
    });
  } catch (e) {
    console.error("Failed to delete contact:", e);
  }
}

async function findContact(email: string) {
  try {
    const data = await api(`/lists/${LIST_ID}/contacts?api_key=${API_KEY}&limit=1&q=${encodeURIComponent(email)}`);
    return data.data?.find((c: any) => c.email_address.toLowerCase() === email.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

export async function createAndSendCampaign(subject: string, htmlContent: string) {
  if (!isNewsletterEnabled()) throw new Error("Newsletter not configured");

  // Create campaign
  const campaign = await api("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      api_key: API_KEY,
      name: subject,
      subject,
      from: {
        name: process.env.EMAIL_FROM?.split("@")[0] ?? "Newsletter",
        email_address: process.env.EMAIL_FROM ?? "noreply@example.com",
      },
      content: {
        html: htmlContent,
        plain_text: htmlContent.replace(/<[^>]+>/g, ""),
      },
    }),
  });

  // Send to list
  await api(`/campaigns/${campaign.id}`, {
    method: "POST",
    body: JSON.stringify({
      api_key: API_KEY,
      send_to: LIST_ID,
    }),
  });

  return campaign.id;
}

export async function getCampaigns() {
  if (!isNewsletterEnabled()) return [];
  try {
    const data = await api(`/campaigns?api_key=${API_KEY}&limit=50`);
    return data.data ?? [];
  } catch {
    return [];
  }
}
