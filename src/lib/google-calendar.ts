const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string; // ISO 8601
  timeZone?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: "email" | "popup"; minutes: number }[];
  };
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink: string;
  status: string;
  created: string;
  updated: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function calendarFetch<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google Calendar API error ${response.status}: ${errorBody}`
    );
  }

  // DELETE returns 204 with no body
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Create Event ────────────────────────────────────────────────────────────

/**
 * Create a new event on the user's primary calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput
): Promise<GoogleCalendarEvent> {
  const body = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startDateTime,
      timeZone: event.timeZone || "UTC",
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: event.timeZone || "UTC",
    },
    reminders: event.reminders || {
      useDefault: false,
      overrides: [{ method: "popup" as const, minutes: 10 }],
    },
  };

  return calendarFetch<GoogleCalendarEvent>(
    accessToken,
    "/calendars/primary/events",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

// ─── List Upcoming Events ────────────────────────────────────────────────────

/**
 * List upcoming events from a specific calendar.
 */
export async function listUpcomingEvents(
  accessToken: string,
  calendarId: string = "primary"
): Promise<GoogleCalendarEvent[]> {
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    timeMin: now,
    maxResults: "50",
    singleEvents: "true",
    orderBy: "startTime",
  });

  const data = await calendarFetch<{ items: GoogleCalendarEvent[] }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );

  return data.items || [];
}

// ─── Delete Event ────────────────────────────────────────────────────────────

/**
 * Delete a calendar event by its Google event ID.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  await calendarFetch<void>(
    accessToken,
    `/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" }
  );
}

// ─── List Calendars ──────────────────────────────────────────────────────────

/**
 * List all calendars the user has access to.
 */
export async function getCalendarList(
  accessToken: string
): Promise<GoogleCalendar[]> {
  const data = await calendarFetch<{ items: GoogleCalendar[] }>(
    accessToken,
    "/users/me/calendarList"
  );

  return data.items || [];
}
