# Stage Academy Tracker

A personal voice and communication training platform built for Vinh Giang's Stage Academy 12-week course. Built this to actually track my progress through the program — record practice sessions, get AI feedback on my speaking, manage weekly tasks, and keep a daily journal. It's basically my command center for getting better at public speaking.

## What it does

- **Weekly Plan** — Each week of the 12-week course has specific tasks (watch videos, do exercises, record yourself). This tracks all of that with a visual day-by-day breakdown.
- **Recording Studio** — Record audio/video right in the browser. Recordings get uploaded to S3, transcribed by Deepgram, and then reviewed by AI (Groq/Llama 3.3 70B) for volume, tonality, pauses, and storytelling.
- **AI Speech Review** — After recording, get scored across 4 dimensions with specific feedback referencing what you actually said. No generic advice — it pulls from your transcript.
- **Daily Planner** — Time-blocked daily planning with categories, a journal video recorder, and reference links. Separate from the course plan — this is for general daily work.
- **Video Library** — All course videos organized by module. Track what you've watched.
- **Dashboard** — Quick stats, today's plan, week overview, course progress.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL
- **Storage:** AWS S3 with presigned URLs
- **Transcription:** Deepgram Nova-2
- **AI Review:** Groq API (Llama 3.3 70B Versatile) — free tier
- **Auth:** NextAuth.js with Google OAuth

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- AWS account with an S3 bucket
- Google Cloud project with OAuth credentials
- API keys: Deepgram, Groq (both have free tiers)

### 1. Clone and install

```bash
git clone https://github.com/Sameer2748/stage-academy.git
cd stage-academy/course-website
npm install
```

### 2. Start PostgreSQL

```bash
docker run -d \
  --name stageacademy-db \
  -e POSTGRES_USER=stageacademy \
  -e POSTGRES_PASSWORD=stageacademy123 \
  -e POSTGRES_DB=stageacademy \
  -p 5433:5432 \
  postgres:16
```

### 3. Set up environment

```bash
cp .env.example .env.local
```

Fill in your actual keys in `.env.local`. See `.env.example` for all required variables.

### 4. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## S3 Bucket Setup

Your S3 bucket needs:

1. **Public read access** (so recordings can be played back):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

2. **CORS configuration**:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Project Structure

```
course-website/
  src/
    app/
      (auth)/login/              - Google OAuth login
      (dashboard)/
        dashboard/               - Home dashboard
        weekly-plan/             - 12-week course plan
        weekly-plan/day/[dayNum] - Daily task view with recording studio
        daily-planner/           - Personal daily planner
        library/                 - Course video library
        progress/                - Progress tracking
      api/
        auth/                    - NextAuth endpoints
        transcribe/              - Deepgram transcription
        ai-review/               - Groq AI speech review
        s3/upload-url/           - Presigned S3 upload URLs
    components/
      layout/Sidebar.tsx         - App navigation
      ui/                        - shadcn/ui components
    lib/
      s3.ts                      - S3 client & helpers
      sidebar-context.tsx        - Sidebar state context
```

## How Recording Works

1. You click record on a task — browser captures audio via MediaRecorder API
2. Real-time waveform visualization shows audio levels (Web Audio API)
3. When you stop, two things happen in parallel:
   - Audio blob gets uploaded to S3 via presigned URL
   - Audio gets sent to Deepgram for transcription
4. Once transcribed, you can request an AI review
5. Groq analyzes the transcript and scores you on volume, tonality, pauses, and storytelling
6. Everything gets saved — recordings persist in S3, metadata in localStorage

## License

MIT
