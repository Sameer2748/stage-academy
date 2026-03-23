import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar_error=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar_error=no_code`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("[calendar/callback] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar_error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens on user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar_connected=true`
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login`
      );
    }
    console.error("[calendar/callback] GET error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar_error=internal_error`
    );
  }
}
