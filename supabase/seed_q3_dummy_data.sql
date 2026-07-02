-- ─────────────────────────────────────────────────────────────────────────────
-- Q3 2026 MIT Tracker — 4 weeks of realistic dummy data
-- Run in Supabase SQL Editor (project: wfihjcpnpceckebwawyk)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fix weekly_rollups department constraint (was using old dept names) ───────
ALTER TABLE weekly_rollups DROP CONSTRAINT IF EXISTS weekly_rollups_department_check;
ALTER TABLE weekly_rollups ADD CONSTRAINT weekly_rollups_department_check
  CHECK (department IN ('Operations','Workshops','Client Success','Sales','Marketing','Events','RevOps','Growth','overall'));

DO $seed$
DECLARE
  r             RECORD;
  w             INT;
  jul_mil_id    UUID;
  blocker_mit_id UUID;
  author        TEXT;
  update_txt    TEXT;
  conf          TEXT;
  blocker_txt   TEXT;
  week_dates    DATE[] := ARRAY[
    '2026-06-30'::DATE,   -- Week 1 (today — shows in current Tuesday Meeting)
    '2026-07-12'::DATE,   -- Week 2
    '2026-07-19'::DATE,   -- Week 3
    '2026-07-26'::DATE    -- Week 4
  ];

BEGIN

  -- ── 1. Wipe prior seed data ──────────────────────────────────────────────
  DELETE FROM executive_rollup_snapshots WHERE week_number BETWEEN 1 AND 4;
  DELETE FROM weekly_rollups WHERE week_number BETWEEN 1 AND 4;
  DELETE FROM mit_status_history WHERE week_number BETWEEN 1 AND 4;
  DELETE FROM daily_inputs WHERE input_date BETWEEN '2026-06-28' AND '2026-07-27';
  DELETE FROM blockers WHERE created_at >= '2026-07-01';
  DELETE FROM monthly_milestones;

  -- ── 2. Update MIT current_status (realistic distribution) ────────────────
  -- First set everything to in_progress, then punch specific ones to at_risk/blocked
  UPDATE department_mits SET current_status = 'in_progress';

  WITH ranked AS (
    SELECT id, department, ROW_NUMBER() OVER (PARTITION BY department ORDER BY id) AS rn
    FROM department_mits
  )
  UPDATE department_mits dm
  SET current_status = CASE
    WHEN ranked.department = 'Sales'        AND ranked.rn = 2 THEN 'blocked'
    WHEN ranked.department = 'Events'       AND ranked.rn = 2 THEN 'blocked'
    WHEN ranked.department = 'Marketing'    AND ranked.rn = 3 THEN 'at_risk'
    WHEN ranked.department = 'Workshops'    AND ranked.rn = 2 THEN 'at_risk'
    WHEN ranked.department = 'Operations'   AND ranked.rn = 1 THEN 'at_risk'
    ELSE dm.current_status
  END
  FROM ranked
  WHERE ranked.id = dm.id;

  -- ── 3. Monthly Milestones (July / August / September) ────────────────────
  INSERT INTO monthly_milestones (department_mit_id, month, description, status)
  SELECT dm.id, 'July',
    CASE dm.department
      WHEN 'Operations'     THEN 'Complete Q3 ops readiness audit and finalize cross-team capacity plan'
      WHEN 'Workshops'      THEN 'Deliver first 3 cohorts with 90%+ completion rate and NPS ≥ 8.5'
      WHEN 'Client Success' THEN 'Establish health score baseline across full portfolio (87 accounts)'
      WHEN 'Sales'          THEN 'Generate $2.1M in new pipeline and close 4 mid-market deals'
      WHEN 'Marketing'      THEN 'Launch Q3 campaign and hit 1,200 MQL target'
      WHEN 'Events'         THEN 'Lock all Q3 venues and confirm 80% of speaker roster'
      WHEN 'RevOps'         THEN 'Deploy updated CRM pipeline and close 3 critical reporting gaps'
      WHEN 'Growth'         THEN 'Pilot 2 new acquisition channels with measurable CAC benchmarks'
    END,
    CASE dm.department
      WHEN 'Sales'   THEN 'at_risk'
      WHEN 'Events'  THEN 'at_risk'
      ELSE 'in_progress'
    END
  FROM department_mits dm;

  INSERT INTO monthly_milestones (department_mit_id, month, description, status)
  SELECT dm.id, 'August',
    CASE dm.department
      WHEN 'Operations'     THEN 'Roll out revised SOPs across all 7 teams with documented signoff'
      WHEN 'Workshops'      THEN 'Scale to 5 concurrent cohorts without NPS regression'
      WHEN 'Client Success' THEN 'Reduce churn-risk accounts by 40% through proactive intervention'
      WHEN 'Sales'          THEN 'Reach 65% of Q3 bookings target by Aug 31'
      WHEN 'Marketing'      THEN 'Hit 2,400 cumulative MQLs and maintain 12% email-to-call conversion'
      WHEN 'Events'         THEN 'Execute flagship Q3 event with 200+ attendees'
      WHEN 'RevOps'         THEN 'Complete data migration and validate all executive dashboards'
      WHEN 'Growth'         THEN 'Double investment in top channel and generate 500 net new leads'
    END,
    'not_started'
  FROM department_mits dm;

  INSERT INTO monthly_milestones (department_mit_id, month, description, status)
  SELECT dm.id, 'September',
    CASE dm.department
      WHEN 'Operations'     THEN 'Publish Q3 retrospective and cross-team lessons learned'
      WHEN 'Workshops'      THEN 'Finalize Q4 curriculum, pricing, and facilitator hiring plan'
      WHEN 'Client Success' THEN 'Deliver QBRs to top 20 accounts and lock Q4 renewal agreements'
      WHEN 'Sales'          THEN 'Close to 100% of Q3 revenue target and build Q4 pipeline'
      WHEN 'Marketing'      THEN 'Complete Q3 debrief and publish Q4 campaign strategy'
      WHEN 'Events'         THEN 'Wrap Q3 events and confirm Q4 calendar with all venues'
      WHEN 'RevOps'         THEN 'Publish Q3 revenue analysis and finalized Q4 forecast model'
      WHEN 'Growth'         THEN 'Present Q3 growth learnings and finalize Q4 channel strategy'
    END,
    'not_started'
  FROM department_mits dm;

  -- ── 4. Daily Inputs — 4 weeks per MIT ────────────────────────────────────
  FOR r IN
    SELECT
      dm.id,
      dm.department,
      dm.title,
      dm.owner,
      dm.current_status,
      ROW_NUMBER() OVER (PARTITION BY dm.department ORDER BY dm.id) AS rn,
      mm.id AS jul_milestone_id
    FROM department_mits dm
    LEFT JOIN monthly_milestones mm ON mm.department_mit_id = dm.id AND mm.month = 'July'
  LOOP
    author := CASE r.department
      WHEN 'Operations'     THEN 'Preston Williams'
      WHEN 'Workshops'      THEN 'Jacob Hopkins'
      WHEN 'Client Success' THEN 'Tiffani Rhodes'
      WHEN 'Sales'          THEN 'Allen Kim'
      WHEN 'Marketing'      THEN 'John Bushnell'
      WHEN 'Events'         THEN 'Ed Turney'
      WHEN 'RevOps'         THEN 'Sarah Okonkwo'
      WHEN 'Growth'         THEN 'Marcus Chen'
      ELSE 'Team Lead'
    END;

    FOR w IN 1..4 LOOP
      -- Build update text based on dept + week
      update_txt := CASE r.department
        WHEN 'Operations' THEN CASE w
          WHEN 1 THEN 'Q3 planning sessions complete. All workstreams have owners and confirmed timelines. Cross-team dependency map drafted.'
          WHEN 2 THEN 'SOPs for 4 of 7 teams drafted and in peer review. Headcount plan sent to finance. One delay on Events SOP due to complexity.'
          WHEN 3 THEN '6 of 7 SOPs complete and signed off. Events SOP extended 1 week — no risk to July milestone. Finance approved 2 of 3 headcount asks.'
          WHEN 4 THEN 'All 7 SOPs complete. Q3 capacity plan submitted. Team transitioning to enforcement and implementation phase starting Aug 1.'
        END
        WHEN 'Workshops' THEN CASE w
          WHEN 1 THEN 'Q3 cohort schedule finalized. First cohort launched — 94% attendance in Week 1. Facilitator assignments confirmed across all cohorts.'
          WHEN 2 THEN 'Cohort 1 at 91% completion rate. Cohort 2 now enrolling — 47 registrations. Materials updated based on Week 1 participant feedback.'
          WHEN 3 THEN 'Cohort 2 underway with 38 active participants. One facilitator out sick — coverage arranged same day, no participant impact.'
          WHEN 4 THEN 'Cohort 2 completed: 88% completion rate, NPS 8.7. Cohort 3 enrolling now — 31 registrations, need 50 for full budget justification.'
        END
        WHEN 'Client Success' THEN CASE w
          WHEN 1 THEN 'Completed initial portfolio review. 87 accounts assessed. Health score framework built and ready for deployment next week.'
          WHEN 2 THEN 'Health scores deployed to 62 accounts. Identified 9 churn-risk accounts. Intervention plans drafted and in motion for 6 of them.'
          WHEN 3 THEN '7 of 9 churn-risk interventions complete. Two accounts still flagged. NPS survey live — early reads tracking at 8.2.'
          WHEN 4 THEN 'All 9 interventions complete. Two accounts upgraded red → yellow. July NPS final: 8.4. July milestone on track to hit.'
        END
        WHEN 'Sales' THEN CASE w
          WHEN 1 THEN 'Pipeline review complete. Strong Q2 carry-over. 6 qualified deals in final stages. Team aligned on Q3 ICP and outreach cadence.'
          WHEN 2 THEN 'Closed 2 deals this week. Pipeline at $1.4M. 8 stalled accounts getting daily outreach. One large deal entering legal review.'
          WHEN 3 THEN 'Large deal fell out of legal — client paused expansion. Replacing with two mid-market deals. Pipeline is $200K short of July milestone.'
          WHEN 4 THEN 'Recovered to $1.9M pipeline. Closed 3 deals total — 1 short of July target. 4 hot deals carrying into August. August outlook strong.'
        END
        WHEN 'Marketing' THEN CASE w
          WHEN 1 THEN 'Q3 campaign creative approved and live. Paid channels ramped up. First MQL batch tracking 12% ahead of Week 1 target.'
          WHEN 2 THEN 'MQLs at 487 — 41% of July target. Email sequence converting at 11.8%. One paid channel underperforming — paused and reallocated.'
          WHEN 3 THEN 'MQLs at 891 — 74% of target. Conversion holding. One creative refresh needed for bottom-funnel email — in production now.'
          WHEN 4 THEN 'July MQL final: 1,247. Hit target with 4% buffer. Paid channel learnings applied — August budget reallocated to top 2 performers.'
        END
        WHEN 'Events' THEN CASE w
          WHEN 1 THEN 'Venue scouting complete for 3 of 4 events. Two contracts out for signature. Speaker list at 60% confirmed. Timeline on track.'
          WHEN 2 THEN 'Venue 3 contract signed. Speaker confirmations at 73%. Registration page for flagship event live — 89 signups in first 3 days.'
          WHEN 3 THEN 'Flagship at 142 registrations — 71% of target. Concerned about the final push. Requested marketing to drive harder promotion.'
          WHEN 4 THEN 'Flagship registration: 178 — 89% of goal. Event is a go. All logistics confirmed. Speaker run-of-show finalized and rehearsed.'
        END
        WHEN 'RevOps' THEN CASE w
          WHEN 1 THEN 'CRM audit complete. Found 3 major data gaps: deal stage mapping, revenue attribution, and forecast rollup logic. Remediation plan drafted.'
          WHEN 2 THEN 'Data gap #1 (deal stage mapping) fully resolved. New pipeline view live in HubSpot. Sales team testing this week — positive early feedback.'
          WHEN 3 THEN 'Data gap #2 (revenue attribution) blocked by HubSpot limitation. Evaluating Segment integration as workaround. ETA pushed by 5 days.'
          WHEN 4 THEN 'Workaround selected: Segment + HubSpot connector. Build underway, ETA Aug 5. Gap #3 (forecast logic) on track — 80% complete.'
        END
        WHEN 'Growth' THEN CASE w
          WHEN 1 THEN 'Two new channels identified for Q3 pilot: LinkedIn outbound and partner referral program. Campaigns launching this week. Baseline CAC set.'
          WHEN 2 THEN 'LinkedIn: 212 outbound touches, 18 responses, 4 meetings booked. Partner referral soft-launched with 3 partners — early signals positive.'
          WHEN 3 THEN 'LinkedIn performing well: averaging 4 meetings/week. Partner program stalled — 2 of 3 partners not activating. Investigating root cause.'
          WHEN 4 THEN 'LinkedIn July total: 16 meetings booked, 3 converted to pipeline ($340K). Partner program: pivoting to 2 new partners with better incentive structure.'
        END
        ELSE 'Solid progress this week. Workstreams on track and no material changes to timeline.'
      END;

      -- Overlay if this is the nth MIT in the dept (to vary content for 2nd/3rd MITs)
      IF r.rn > 1 THEN
        update_txt := update_txt || CASE w
          WHEN 1 THEN ' Secondary workstream kicked off in parallel — initial scoping complete.'
          WHEN 2 THEN ' Secondary workstream progressing. No blockers.'
          WHEN 3 THEN ' Secondary workstream 60% complete. On track for month-end.'
          WHEN 4 THEN ' Secondary workstream delivered. Moved to maintenance mode.'
        END;
      END IF;

      -- Override update for blocked MITs
      IF r.current_status = 'blocked' THEN
        update_txt := CASE r.department
          WHEN 'Sales'   THEN 'ESCALATED: Lost $800K enterprise deal due to client budget freeze. Pipeline now $200K short of July milestone. Emergency pipeline review with Ned this week. Two replacement deals in play but timeline is tight.'
          WHEN 'Events'  THEN 'ESCALATED: Flagship venue contract in legal dispute. Backup venue identified — 15% higher cost. Awaiting Ned sign-off on cost increase. Event date not yet at risk but decision needed by Friday.'
          ELSE 'Blocker identified and escalated. See blocker log for details.'
        END;
      END IF;

      -- Set confidence based on status and week
      conf := CASE
        WHEN r.current_status = 'blocked'                            THEN 'off_track'
        WHEN r.current_status = 'at_risk'  AND w >= 3               THEN 'shaky'
        WHEN r.current_status = 'at_risk'  AND w < 3                THEN 'confident'
        ELSE 'confident'
      END;

      -- Set blocker text for blocked/at_risk MITs in later weeks
      blocker_txt := CASE
        WHEN r.current_status = 'blocked' AND r.department = 'Sales'
          THEN 'Lost $800K enterprise deal. Need 2 replacement deals in 2 weeks to hit July milestone.'
        WHEN r.current_status = 'blocked' AND r.department = 'Events'
          THEN 'Venue contract dispute. Need legal resolution or backup venue approval by Friday.'
        WHEN r.current_status = 'at_risk' AND w >= 3
          THEN 'Timeline is tighter than planned. Watching closely — may need to reprioritize.'
        ELSE NULL
      END;

      INSERT INTO daily_inputs (
        department_mit_id, author_name, update_text, blockers, notes, input_date, milestone_id
      ) VALUES (
        r.id,
        author,
        update_txt,
        blocker_txt,
        'confidence:' || conf,
        week_dates[w],
        r.jul_milestone_id
      );
    END LOOP;
  END LOOP;

  -- ── 5. Blockers ──────────────────────────────────────────────────────────
  -- Critical open: Sales pipeline
  INSERT INTO blockers (department_mit_id, reported_by, description, severity, status, created_at)
  SELECT dm.id, 'Allen Kim',
    'Enterprise client froze expansion budget mid-deal — lost $800K in expected close. No immediate replacement at pipeline depth needed. July milestone at risk.',
    'critical', 'open', '2026-07-15 09:00:00+00'
  FROM department_mits dm WHERE dm.department = 'Sales' AND dm.current_status = 'blocked' LIMIT 1;

  -- High open: Events venue
  INSERT INTO blockers (department_mit_id, reported_by, description, severity, status, created_at)
  SELECT dm.id, 'Ed Turney',
    'Flagship Q3 event venue contract in legal dispute over cancellation clause. Backup venue identified but 15% cost increase needs VP approval. Event date holds for now.',
    'high', 'open', '2026-07-18 14:30:00+00'
  FROM department_mits dm WHERE dm.department = 'Events' AND dm.current_status = 'blocked' LIMIT 1;

  -- Medium in_progress: RevOps HubSpot limitation
  INSERT INTO blockers (department_mit_id, reported_by, description, severity, status, created_at)
  SELECT dm.id, 'Sarah Okonkwo',
    'HubSpot native connector does not support multi-touch attribution required for our model. Evaluating Segment integration — adds 5 days to timeline.',
    'medium', 'in_progress', '2026-07-14 10:00:00+00'
  FROM department_mits dm WHERE dm.department = 'RevOps' LIMIT 1;

  -- Low resolved: Workshops facilitator
  INSERT INTO blockers (department_mit_id, reported_by, description, severity, status, created_at, resolved_at, resolution_notes)
  SELECT dm.id, 'Jacob Hopkins',
    'Lead facilitator called out sick mid-cohort on July 12. Risk of session cancellation.',
    'low', 'resolved', '2026-07-12 08:00:00+00', '2026-07-12 16:00:00+00',
    'Backup facilitator stepped in. Session ran on time with no participant impact. NPS unaffected.'
  FROM department_mits dm WHERE dm.department = 'Workshops' LIMIT 1;

  -- Medium resolved: Growth partner
  INSERT INTO blockers (department_mit_id, reported_by, description, severity, status, created_at, resolved_at, resolution_notes)
  SELECT dm.id, 'Marcus Chen',
    'Two of three launch partners not activating referrals — incentive structure misaligned with their model.',
    'medium', 'resolved', '2026-07-16 11:00:00+00', '2026-07-22 09:00:00+00',
    'Revised partner agreement with tiered incentives sent and signed. Referral flow now live for both partners.'
  FROM department_mits dm WHERE dm.department = 'Growth' LIMIT 1;

  -- ── 6. MIT Status History (weeks 1-4) ────────────────────────────────────
  FOR r IN SELECT id, current_status FROM department_mits LOOP
    FOR w IN 1..4 LOOP
      INSERT INTO mit_status_history (department_mit_id, status, week_number, recorded_at)
      VALUES (
        r.id,
        CASE
          WHEN w <= 2                                                   THEN 'in_progress'
          WHEN w = 3 AND r.current_status IN ('at_risk','blocked')      THEN 'at_risk'
          WHEN w = 4                                                    THEN r.current_status
          ELSE 'in_progress'
        END,
        w,
        (DATE '2026-06-29' + ((w - 1) * 7 + 7) * INTERVAL '1 day')
      )
      ON CONFLICT (department_mit_id, week_number) DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── 7. Weekly Rollups — Week 1 for all 8 departments ─────────────────────
  INSERT INTO weekly_rollups (week_number, week_start, week_end, department, summary, status_assessment, generated_at) VALUES

  (1, '2026-06-29', '2026-07-05', 'Operations',
   'Strong Q3 start. Planning complete, all workstreams have owners.',
   '{"look_back":{"general_progress":"Operations entered Q3 fully aligned. All workstreams have clear owners and confirmed timelines. Cross-team dependency mapping is underway.","key_decisions":"Agreed to centralize SOPs in Notion rather than department wikis — cleaner for Ned to review.","areas_of_challenge":"Early friction getting Events team aligned on SOP format. Resolved in Day 3 sync — no lasting impact."},"look_ahead":{"top_priorities":"1) Draft SOPs for top 3 teams by Wednesday. 2) Complete dependency map. 3) Submit headcount plan to finance.","roadblocks_to_alleviate":"Events alignment resolved. No open blockers.","upcoming_decisions":"Choose SOP documentation platform and template format."},"mit_status":[{"department":"Operations","mit_title":"Q3 SOP Overhaul","status":"in_progress","brief_update":"Kicked off strong — 2 of 7 teams drafted in Week 1"},{"department":"Operations","mit_title":"Headcount & Capacity Plan","status":"in_progress","brief_update":"Scoping complete — submission to finance next week"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Workshops',
   'First cohort launched strong. Schedule confirmed. Facilitators assigned.',
   '{"look_back":{"general_progress":"Q3 cohort schedule locked. Cohort 1 launched Monday with 94% attendance Week 1 — above baseline. Materials updated from Q2 feedback.","key_decisions":"Chose to cap Cohort 3 at 60 participants to maintain quality — will open waitlist if demand exceeds.","areas_of_challenge":"Minor scheduling conflict for one facilitator — resolved before launch."},"look_ahead":{"top_priorities":"1) Drive Cohort 2 enrollment to 50+. 2) Complete Week 2 facilitator check-in. 3) Begin Cohort 3 materials prep.","roadblocks_to_alleviate":"No open blockers.","upcoming_decisions":"Whether to add a fourth cohort in August if Cohort 2 waitlist exceeds 20."},"mit_status":[{"department":"Workshops","mit_title":"Q3 Cohort Delivery","status":"in_progress","brief_update":"Cohort 1 live — 94% attendance, NPS pending"},{"department":"Workshops","mit_title":"Facilitator Bench","status":"at_risk","brief_update":"One facilitator has limited August availability — need backup identified"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Client Success',
   'Portfolio review complete. Health framework ready to deploy.',
   '{"look_back":{"general_progress":"Full portfolio of 87 accounts reviewed. Health score framework built with three tiers. Ready to deploy next week.","key_decisions":"Agreed on a 60-day intervention SLA for red accounts — any account that stays red for 60 days triggers an executive call.","areas_of_challenge":"Getting consistent data from HubSpot for all accounts required manual cleanup — 12 accounts had stale data."},"look_ahead":{"top_priorities":"1) Deploy health scores to all accounts. 2) Identify top churn risks. 3) Draft intervention playbook.","roadblocks_to_alleviate":"HubSpot data quality — one-time cleanup done, should not recur.","upcoming_decisions":"Whether to share health scores directly with clients or keep internal-only."},"mit_status":[{"department":"Client Success","mit_title":"Health Score Rollout","status":"in_progress","brief_update":"Framework built — deployment begins Week 2"},{"department":"Client Success","mit_title":"Churn Risk Reduction","status":"in_progress","brief_update":"Risk accounts not yet identified — pending health scores"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Sales',
   'Q2 pipeline carrying over strong. 6 deals in final stages.',
   '{"look_back":{"general_progress":"Q3 pipeline review complete. Strong Q2 carry-over with 6 qualified deals in final stages. Team aligned on ICP and outreach cadence.","key_decisions":"Increased ICP narrowing to focus only on $50K+ ACV accounts — reduces volume but improves close rate.","areas_of_challenge":"One large enterprise deal moving slower than expected — legal cycles are long at that account."},"look_ahead":{"top_priorities":"1) Close 2 of the 6 pipeline deals by Week 2. 2) Drive daily outreach on 8 stalled accounts. 3) Move enterprise deal to legal.","roadblocks_to_alleviate":"Enterprise deal timeline — may need Ned to send exec intro letter.","upcoming_decisions":"Whether to break the enterprise deal into phased contract to accelerate close."},"mit_status":[{"department":"Sales","mit_title":"New Business Pipeline","status":"in_progress","brief_update":"$1.4M in qualified pipeline — 6 deals in final stages"},{"department":"Sales","mit_title":"Mid-Market Program","status":"blocked","brief_update":"Lost $800K deal — recovery plan in progress"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Marketing',
   'Q3 campaign live. Paid channels ramped. MQLs tracking ahead of Week 1 target.',
   '{"look_back":{"general_progress":"Q3 campaign creative approved and launched. All paid channels live. First week MQL batch 12% ahead of target — strong early signal.","key_decisions":"Shifted 20% of Google spend to LinkedIn based on Q2 performance data — running in parallel for first 2 weeks before committing.","areas_of_challenge":"Creative approval cycle took 2 extra days — now building in additional buffer for August campaign."},"look_ahead":{"top_priorities":"1) Monitor channel performance daily and cut underperformers by Week 2. 2) Launch email nurture sequence. 3) Hit 500 MQLs by end of Week 2.","roadblocks_to_alleviate":"Creative bottleneck — adding second designer to rotation.","upcoming_decisions":"LinkedIn vs. Google budget allocation — decide by Week 2 data."},"mit_status":[{"department":"Marketing","mit_title":"Q3 Demand Generation","status":"in_progress","brief_update":"MQLs tracking 12% ahead of Week 1 target"},{"department":"Marketing","mit_title":"Brand Refresh","status":"in_progress","brief_update":"New brand assets live — monitoring resonance in ad creative"},{"department":"Marketing","mit_title":"Content Engine","status":"at_risk","brief_update":"Content calendar 3 weeks behind — contractor bandwidth issue"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Events',
   'Venue scouting complete. 2 contracts out. Speakers at 60%.',
   '{"look_back":{"general_progress":"Venue scouting complete for 3 of 4 Q3 events. Two contracts out for signature. Speaker list at 60% confirmed — ahead of plan.","key_decisions":"Decided to move flagship event from Week 9 to Week 8 to give more time for Q3 wrap-up activities.","areas_of_challenge":"One preferred venue is unavailable on target date — scouting alternative now, no impact to timeline yet."},"look_ahead":{"top_priorities":"1) Get both venue contracts signed. 2) Confirm remaining 40% of speaker roster. 3) Open flagship event registration.","roadblocks_to_alleviate":"Venue availability concern — escalate if no resolution by Wednesday.","upcoming_decisions":"Backup venue for Venue 1 if current negotiations fail."},"mit_status":[{"department":"Events","mit_title":"Q3 Event Calendar","status":"in_progress","brief_update":"3 of 4 venues in contract — on track"},{"department":"Events","mit_title":"Flagship Event","status":"blocked","brief_update":"Venue contract in legal dispute — backup identified, needs approval"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'RevOps',
   'CRM audit complete. 3 data gaps found. Remediation underway.',
   '{"look_back":{"general_progress":"Full CRM audit complete. Found 3 major data gaps that are creating inaccurate executive dashboards. Remediation plan drafted with 6-week timeline.","key_decisions":"Prioritizing deal stage mapping fix first (highest executive visibility), then attribution, then forecast rollup.","areas_of_challenge":"Scope of data gaps is larger than initially estimated — required bringing in a contractor for the migration work."},"look_ahead":{"top_priorities":"1) Resolve deal stage mapping gap by EOW. 2) Brief Sales team on new pipeline view. 3) Begin attribution gap analysis.","roadblocks_to_alleviate":"Contractor onboarding — happening this week.","upcoming_decisions":"Whether to run a full historical data backfill or start clean from Q3 data."},"mit_status":[{"department":"RevOps","mit_title":"CRM Data Quality","status":"in_progress","brief_update":"3 gaps identified — remediation prioritized and underway"},{"department":"RevOps","mit_title":"Executive Dashboards","status":"in_progress","brief_update":"Paused pending data gap resolution — ETA Week 3"}]}',
   '2026-07-06 08:00:00+00'),

  (1, '2026-06-29', '2026-07-05', 'Growth',
   'Two new channels identified and pilots launching.',
   '{"look_back":{"general_progress":"Two Q3 channel pilots selected: LinkedIn outbound and partner referral program. Baseline CAC established from Q2 data. Both campaigns launched by end of Week 1.","key_decisions":"Set 8-week test window per channel before making budget commitment decision — rigorous but gives enough data.","areas_of_challenge":"Partner agreements took longer to finalize than expected — one partner still negotiating terms."},"look_ahead":{"top_priorities":"1) Run LinkedIn campaign and track responses daily. 2) Lock all 3 partner agreements. 3) Establish weekly CAC tracking cadence.","roadblocks_to_alleviate":"Third partner agreement — resolve by Week 2 or cut that partner.","upcoming_decisions":"Whether to add a third channel (podcast sponsorships) to the pilot mix."},"mit_status":[{"department":"Growth","mit_title":"Channel Diversification","status":"in_progress","brief_update":"LinkedIn and partner programs launched — early signals TBD"},{"department":"Growth","mit_title":"CAC Optimization","status":"in_progress","brief_update":"Baseline set — tracking starts Week 2"}]}',
   '2026-07-06 08:00:00+00');

  -- ── 8. Executive Rollup Snapshot — Week 1 ────────────────────────────────
  INSERT INTO executive_rollup_snapshots (
    week_number, snapshot_date, overall_status, summary,
    department_statuses, key_wins, key_risks, recommendations
  ) VALUES (
    1,
    '2026-07-06',
    'yellow',
    'Q3 opened with solid momentum across most departments. 6 of 8 departments are executing on plan with no major surprises. Two areas warrant attention this week: Sales lost an $800K enterprise deal and is working recovery options, and Events has a venue contract in dispute that needs a quick decision. Operations, Client Success, RevOps, and Growth all had clean Week 1 starts. Marketing is tracking ahead of MQL targets. Workshops launched strong.',
    '{"Operations":{"status":"at_risk","note":"Planning complete, SOPs behind pace"},"Workshops":{"status":"in_progress","note":"Cohort 1 live, strong attendance"},"Client Success":{"status":"in_progress","note":"Framework built, deploying Week 2"},"Sales":{"status":"blocked","note":"Lost $800K deal — recovery in progress"},"Marketing":{"status":"in_progress","note":"MQLs 12% ahead of target"},"Events":{"status":"blocked","note":"Venue contract dispute, backup needed"},"RevOps":{"status":"in_progress","note":"3 data gaps found, remediation underway"},"Growth":{"status":"in_progress","note":"Both pilots launched"}}',
    '• Marketing MQLs tracking 12% ahead of Week 1 target
• Workshops Cohort 1 launched with 94% attendance
• Client Success portfolio review completed — 87 accounts assessed
• Growth pilots launched in Week 1 as planned
• RevOps audit complete — gaps found and remediation plan drafted',
    '• Sales: Lost $800K enterprise deal — July milestone at risk. Pipeline short $200K.
• Events: Venue contract dispute on flagship event — decision on backup venue needed by Friday.
• Operations: SOP pace slightly behind — 2 of 7 complete vs. target of 3.
• Marketing: One content MIT behind on calendar — contractor bandwidth issue.',
    '• Ned to review Sales situation and determine if executive outreach to replacement accounts is appropriate.
• Approve Events backup venue decision ($15K cost increase) by EOD Thursday to protect event date.
• Consider whether Operations SOP pace warrants resource reallocation or timeline adjustment.'
  );

  RAISE NOTICE 'Q3 seed data complete. 4 weeks of inputs, milestones, blockers, status history, rollups, and executive snapshot inserted.';

END $seed$;
