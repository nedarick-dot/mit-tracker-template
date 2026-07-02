// ─────────────────────────────────────────────────────────────────────────────
// MIT Tracker — Team Configuration
// Edit THIS FILE to configure the app for your team. Nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  /** Shown in the browser tab */
  appName: 'MIT Execution OS',

  /** Your team or org name — shown in the top header */
  teamName: 'My Team',

  quarter: {
    /** Display label shown throughout the app */
    label: 'Q3 2026',

    /** Quarter start date — YYYY-MM-DD */
    startDate: '2026-07-01',

    /** Quarter end date — YYYY-MM-DD */
    endDate: '2026-09-30',

    /** Total number of weeks in the quarter (typically 13) */
    totalWeeks: 13,

    /**
     * Names for the three monthly milestone periods.
     * The quarter is split into a 4 / 5 / 4 week cadence.
     * e.g. Q3 → ['July', 'August', 'September']
     *      Q4 → ['October', 'November', 'December']
     */
    months: ['July', 'August', 'September'] as [string, string, string],
  },

  /**
   * Your departments. Each entry needs a unique name and a CSS color string.
   * You can have any number of departments — just add or remove rows.
   * Color tip: use hsl() values for easy theming, or any valid CSS color.
   */
  departments: [
    { name: 'Operations',     color: 'hsl(220, 70%, 50%)' },
    { name: 'Workshops',      color: 'hsl(262, 60%, 55%)' },
    { name: 'Client Success', color: 'hsl(330, 65%, 50%)' },
    { name: 'Sales',          color: 'hsl(25,  95%, 53%)' },
    { name: 'Marketing',      color: 'hsl(190, 80%, 42%)' },
    { name: 'Events',         color: 'hsl(142, 55%, 42%)' },
    { name: 'RevOps',         color: 'hsl(45,  93%, 47%)' },
    { name: 'Growth',         color: 'hsl(243, 75%, 59%)' },
  ],

  /**
   * The department whose lead submits updates via the web app instead of Slack.
   * Typically this is the person who manages the tracker (the admin/ops lead).
   * Must exactly match one of the department names above.
   */
  adminDepartment: 'Operations',
};
