/* ============================================================================
   EDGE — SITE CONTENT
   ----------------------------------------------------------------------------
   THIS IS THE FILE YOU EDIT. Everything the site shows comes from here.

   Rules:
     - Keep the commas and quote marks exactly as they are.
     - Anything marked  // TODO  is a placeholder. Replace it.
     - Save, refresh the browser. There is nothing to rebuild.
   ========================================================================== */

const EDGE = {

  /* ---------------------------------------------------------------- CLUB -- */
  club: {
    name:       "EDGE",
    full:       "EDGE Esports Club",
    university: "Ramaiah University of Applied Sciences",
    tagline:    "Esports and gaming at RUAS.",
    email:      "edge@msruas.ac.in",           // TODO confirm
    instagram:  "",                            // TODO e.g. https://instagram.com/edge.ruas
    discord:    "",                            // TODO invite link
    youtube:    ""                             // TODO
  },

  /* ============================================================== 1. BLOG ==
     Two kinds of post sit in the same feed:

       type: "post"       - your own upload. Give it a `media` path (put the
                            file in assets/blog/) or leave media empty for a
                            text-only post. Images and .mp4 both work.
       type: "instagram"  - an Instagram post. Paste its URL into `url`.
                            No API key, no token, no developer account -
                            Instagram renders it from the link alone.

     `tag` drives the filter chips. Any tag you invent appears automatically.
     ======================================================================= */
  blog: [
    {
      type:  "post",
      title: "Freshers Showdown - finals night",            // TODO
      date:  "2026-09-05",
      tag:   "Events",
      media: "",                      // e.g. "assets/blog/showdown-finals.jpg"
      alt:   "Finals night at the Freshers Showdown",
      body:  "Sixty-four players, three titles, one long night. The grand final went to a full five maps.",
      credit: ""                      // optional photo credit
    },
    {
      type: "instagram",
      url:  "",                       // TODO paste an Instagram post URL
      tag:  "Instagram"
      // Leave `url` empty and this card is skipped automatically.
    },
    {
      type:  "post",
      title: "Club fair - day one",                          // TODO
      date:  "2026-08-28",
      tag:   "Clips",
      media: "",
      alt:   "The EDGE stand at the club fair",
      body:  "The 1v1 station ran non-stop for four hours. The leaderboard changed hands eleven times.",
      credit: ""
    }
  ],

  /* ================================================== 2. JOIN (the form) ==
     Two paths. Member is the light one; Roster asks the competitive
     questions on top of it.
     ======================================================================= */
  join: {
    heading: "Join EDGE",
    intro:   "Two ways in. Pick the one that fits - you can always move up to a roster later.",

    paths: {
      member: {
        label: "Member",
        blurb: "Come to events, play socials, help run things. No tryout, no commitment to compete."
      },
      roster: {
        label: "Roster",
        blurb: "Compete for EDGE in a title. Tryouts, scheduled practice, and you represent the club."
      }
    },

    // TODO replace with the exact branch names RUAS uses
    branches: [
      "Computer Science & Engineering",
      "Information Science & Engineering",
      "Artificial Intelligence & Machine Learning",
      "Electronics & Communication Engineering",
      "Electrical & Electronics Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Aerospace Engineering",
      "Biotechnology",
      "Pharmacy",
      "Dental Sciences",
      "Management & Commerce",
      "Art & Design",
      "Other"
    ],

    years: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"],

    // Titles someone can try out for (Roster path)
    titles: ["Valorant", "BGMI", "Counter-Strike 2", "EA FC", "Chess", "Rocket League"],

    // Non-playing ways to contribute (Member path)
    interests: ["Casting", "Graphics", "Video / Editing", "Development",
                "Event Crew", "Social Media", "Photography", "Just playing"],

    success: {
      member: "You are in. Watch your email - the committee sends event invites there first.",
      roster: "Tryout request received. Someone will contact you about the next tryout window for your title."
    },

    /* ---------------------------------------------------------------------
       WHERE REGISTRATIONS GO
       ---------------------------------------------------------------------
       Supabase. Two values are needed and only you can generate them - see
       the README section "Turning the form on". Until they are filled in,
       submissions are held safely in the browser and re-sent automatically
       once the keys are in place.
       ------------------------------------------------------------------ */
    backend: {
      mode: "supabase",                 // "supabase" | "demo"
      supabase: {
        url:      "",                   // TODO https://xxxxxxxx.supabase.co
        anon_key: "",                   // TODO the "anon public" key
        table:    "registrations"
      }
    }
  },

  /* =============================================================== 3. FAQ ==
     The chatbot answers from this list. It matches what someone types
     against `keywords`, so add the words people actually use, including
     slang and likely misspellings.

     Every entry also renders as a plain FAQ list under the chat, so nobody
     is ever stuck if the bot misunderstands.
     ======================================================================= */
  faq: {
    greeting: "Ask me anything about EDGE - what we are, how to join, tryouts, events.",
    suggestions: [
      "What is EDGE?",
      "How do I join?",
      "What games do you play?",
      "Do I need to be good?",
      "When are tryouts?"
    ],
    fallback: "I do not have an answer for that one yet. Try one of the questions below, or email us and a person will reply.",

    entries: [
      {
        q: "What is EDGE?",
        keywords: ["edge", "about", "club", "tell", "mean", "means", "stands", "stand", "explain", "definition"],
        a: "EDGE is the esports and gaming club at Ramaiah University of Applied Sciences. We run competitive teams across several titles, host tournaments, produce our own broadcasts, and build the technology behind them. It is run by students, but it is set up to work like a real esports organisation rather than a casual gaming group."
      },
      {
        q: "How do I join?",
        keywords: ["join", "sign", "signup", "want", "interested", "keen", "register", "registration", "enroll", "enrol", "apply", "application", "become", "part", "entry"],
        a: "Open the Join tab and fill in the form. You pick one of two paths: Member if you want to come to events and help run things with no tryout, or Roster if you want to compete for EDGE in a specific title. Members are accepted on submission; roster applicants get contacted about the next tryout."
      },
      {
        q: "What is the difference between Member and Roster?",
        keywords: ["difference", "member", "roster", "versus", "vs", "between", "option", "choose", "path", "compare"],
        a: "Member means you are part of the club - events, socials, and helping with production, graphics, casting or crew. No tryout and no obligation to compete. Roster means you play competitively for EDGE in a title: you try out, practise on a schedule, and represent the club at tournaments."
      },
      {
        q: "What games do you play?",
        keywords: ["games", "game", "titles", "title", "play", "playing", "valorant", "bgmi", "pubg", "cs", "csgo", "cs2", "counter", "strike", "fifa", "fc", "chess", "rocket", "league"],
        a: "Right now: Valorant, BGMI, Counter-Strike 2, EA FC, Chess and Rocket League. If enough people want a title we do not field yet, bring it to the committee - new divisions open when there is a roster's worth of interest."
      },
      {
        q: "Do I need to be good at games to join?",
        keywords: ["good", "skill", "skilled", "rank", "ranked", "noob", "beginner", "bad", "casual", "pro", "experience", "need", "requirement", "qualify", "worthy"],
        a: "Not to be a Member - that path has no skill requirement at all, and plenty of members contribute through casting, graphics, editing, events or dev work instead of playing. Roster spots are competitive and do involve a tryout, but rank is not the only thing looked at: attitude, availability and coachability matter as much."
      },
      {
        q: "When are tryouts?",
        keywords: ["tryout", "tryouts", "trial", "trials", "selection", "audition", "date", "dates", "schedule", "timing"],
        a: "Tryouts run per title, not all at once, and dates are announced in the Updates tab and on Instagram. Submit the Join form on the Roster path and you will be contacted directly when the window for your title opens."
      },
      {
        q: "Does it cost anything?",
        keywords: ["cost", "costs", "much", "fee", "fees", "price", "pay", "payment", "money", "free", "charge", "expensive", "rupees"],
        a: "Membership is free. Some external tournaments charge their own entry fee, and if that applies you will be told well before you commit to anything."
      },
      {
        q: "Can first-year students join?",
        keywords: ["first", "fresher", "freshers", "1st", "year", "junior", "new", "newcomer", "senior", "eligible", "eligibility", "allowed"],
        a: "Yes - any year can join, and first-years are actively wanted. The Freshers Showdown exists specifically so new students have a way in during their first weeks."
      },
      {
        q: "I cannot play well but I want to help. Is there a place for me?",
        keywords: ["help", "helping", "contribute", "caster", "editor", "photographer", "artist", "volunteer", "crew", "cast", "casting", "commentary", "graphics", "design", "designer", "edit", "editing", "video", "dev", "developer", "code", "coding", "social", "media", "photo", "photography", "organise", "organize", "manage"],
        a: "Yes, and this is the part most people miss. EDGE needs casters, graphic designers, video editors, developers, photographers, social media people and event crew. A tournament needs more people off the server than on it. Pick Member on the Join form and tick what interests you."
      },
      {
        q: "How do I get on the leaderboard?",
        keywords: ["leaderboard", "ranking", "rankings", "rank", "points", "score", "standings", "table", "climb", "top", "position"],
        a: "Play in club events. Points come from placements in EDGE-run tournaments and ladder matches, and the table in the Players tab is updated after each event."
      },
      {
        q: "How do I contact the committee?",
        keywords: ["contact", "email", "mail", "reach", "message", "dm", "instagram", "discord", "talk", "speak", "committee", "admin", "someone"],
        a: "Email works best for anything official. For quick questions, Instagram DMs and the Discord are usually faster - the links are in the footer."
      },
      {
        q: "Where do you post updates?",
        keywords: ["updates", "update", "news", "announcement", "announcements", "notification", "notifications", "notified", "follow", "post"],
        a: "The Updates tab on this site has everything, and it is the source of truth for dates. Instagram gets the same announcements plus clips and photos."
      }
    ]
  },

  /* ============================================================ 4. PLAYERS ==
     Two views: the leaderboard table, and the official rosters.
     ======================================================================= */
  players: {
    leaderboardNote: "Points from placements in EDGE-run tournaments and ladder matches. Updated after each event.",

    // TODO replace with real standings. `move` is the change in position since
    // the last update: positive is a climb, negative a drop, 0 no change.
    leaderboard: [
      { ign: "PLAYER-01", name: "Full Name", game: "Valorant", points: 0, w: 0, l: 0, move: 0 },
      { ign: "PLAYER-02", name: "Full Name", game: "BGMI",     points: 0, w: 0, l: 0, move: 0 },
      { ign: "PLAYER-03", name: "Full Name", game: "Valorant", points: 0, w: 0, l: 0, move: 0 },
      { ign: "PLAYER-04", name: "Full Name", game: "EA FC",    points: 0, w: 0, l: 0, move: 0 },
      { ign: "PLAYER-05", name: "Full Name", game: "Chess",    points: 0, w: 0, l: 0, move: 0 }
    ],

    // status: "active" fields a full roster; "recruiting" shows a tryout call
    rosters: [
      {
        game: "Valorant", name: "EDGE Valorant", format: "5v5 Tactical Shooter", status: "active",
        players: [
          { ign: "PLAYER-01", name: "Full Name", role: "Duelist"    },   // TODO
          { ign: "PLAYER-02", name: "Full Name", role: "Controller" },
          { ign: "PLAYER-03", name: "Full Name", role: "Initiator"  },
          { ign: "PLAYER-04", name: "Full Name", role: "Sentinel"   },
          { ign: "PLAYER-05", name: "Full Name", role: "Flex / IGL" }
        ]
      },
      {
        game: "BGMI", name: "EDGE BGMI", format: "Squad Battle Royale", status: "active",
        players: [
          { ign: "PLAYER-01", name: "Full Name", role: "IGL"       },   // TODO
          { ign: "PLAYER-02", name: "Full Name", role: "Assaulter" },
          { ign: "PLAYER-03", name: "Full Name", role: "Support"   },
          { ign: "PLAYER-04", name: "Full Name", role: "Sniper"    }
        ]
      },
      {
        game: "Counter-Strike 2", name: "EDGE CS2", format: "5v5 Tactical Shooter",
        status: "recruiting", players: []
      }
    ]
  },

  /* ============================================ 5. NOTIFICATIONS & UPDATES ==
     kind: "event" | "announcement" | "result" | "deadline"
     Set pinned:true to lock something to the top.
     Anything dated in the future is automatically "upcoming"; past dates drop
     into the archive below. You never sort this list yourself.
     ======================================================================= */

  /* ============================================================= 6. ABOUT ==
     The club's own account of itself. Keep it honest: this page is what a
     sponsor or a faculty member reads to decide whether EDGE is real. Do not
     add achievements that have not happened.
     ======================================================================= */
  about: {
    // One line, set large. Short beats clever here.
    lead: "A student club run like an esports organisation.",

    body: [
      "EDGE is the esports and gaming club at Ramaiah University of Applied Sciences. We field competitive rosters across several titles, run tournaments on campus, and produce our own live broadcasts.",
      "There are two ways to be part of it. Members come to events, play socials and help run things, with no tryout and no obligation to compete. Roster players represent the club in a specific title, which means tryouts, scheduled practice and actually turning up.",
      "We build our own tooling rather than renting it - the broadcast overlays, the brackets and this site are made by members. If you want to learn how an event is produced rather than only play in one, that work is open to you too.",
      "The club is young and we would rather say so than pretend otherwise. Much of what is on this site is still being filled in as we run our first full season."   // TODO revise once the club has history
    ],

    // Shown as a lettered list. Keep every value factual.
    facts: [
      { label: "University", value: "RUAS, Bengaluru" },
      { label: "Founded",    value: "2026" },              // TODO confirm
      { label: "Titles",     value: "6" },                 // TODO keep in step with join.titles
      { label: "Ways in",    value: "Member / Roster" }
    ],

    pillars: [
      { title: "Compete",   body: "Structured rosters with tryouts, practice schedules and a competitive calendar." },
      { title: "Host",      body: "Tournaments run on campus, from the bracket to the finals night." },
      { title: "Broadcast", body: "Live production with our own overlays, casting and replays." },
      { title: "Build",     body: "The brackets, overlays and this website are made by club members." }
    ],

    // The committee. Leave the list empty and the section hides itself.
    crew: [
      // { name: "Full Name", role: "President" },          // TODO
    ]
  },

  updates: [
    {
      kind: "deadline", pinned: true,
      title: "Valorant tryouts - registration closes",        // TODO
      date: "2026-09-26", time: "23:59",
      body: "Last call for the Valorant roster. Submit the Join form on the Roster path before this closes."
    },
    {
      kind: "event",
      title: "Freshers Showdown",                             // TODO
      date: "2026-09-28", time: "16:00",
      venue: "Main Campus",
      body: "Open bracket across Valorant, BGMI and EA FC. Free entry for all first-year students."
    },
    {
      kind: "announcement",
      title: "CS2 division opening",
      date: "2026-09-15",
      body: "We are forming a Counter-Strike 2 roster. Tryout dates will be announced once we have enough sign-ups."
    },
    {
      kind: "result",
      title: "Intra-University Cup - final standings",
      date: "2026-05-18",
      body: "Sixteen teams, single elimination. The full bracket and VODs are on Instagram."
    }
  ]
};
