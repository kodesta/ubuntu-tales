/**
 * Legal + editorial policy copy. Drafted for this build; final wording needs legal review before a
 * public launch (tracked as a launch blocker in docs/launch/launch-checklist.md).
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of use',
    updated: '15 November 2026',
    intro:
      'Ubuntu Tales is a reading home for African folktales. These terms explain what you can expect from us, and what we ask of you.',
    sections: [
      {
        heading: 'Reading as a guest',
        paragraphs: [
          'You can read and listen without an account. Guest reading lists, follows and progress are kept on your device only.',
        ],
      },
      {
        heading: 'Your account',
        paragraphs: [
          'You must be at least 13 years old to create an account. Keep your password to yourself; we will never ask you for it by email or message.',
          'You may close your account at any time. When account deletion ships, it will remove your personal activity from the archive within 30 days.',
        ],
      },
      {
        heading: 'Submitted tales',
        paragraphs: [
          'When you submit a tale you confirm you have the right to share it. By submitting, you grant Ubuntu Tales a non-exclusive licence to publish, edit for clarity and audio-record the telling, with attribution to you or to the tradition you name.',
          'Editors may request changes, approve or decline a submission. Editorial decisions are final but always explained.',
        ],
      },
      {
        heading: 'Respectful use',
        paragraphs: [
          'Do not submit content that is hateful, harmful, knowingly inaccurate about a living culture, or that you do not have the right to share.',
          'Do not attempt to disrupt the service, scrape it at scale, or bypass access controls.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We will tell account holders by email before material changes to these terms take effect.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy and data',
    updated: '15 November 2026',
    intro:
      'Ubuntu Tales is built around data minimisation. We collect what the product needs, explain why, and give you control. This summary covers POPIA (South Africa), the NDPA (Nigeria), the Kenya Data Protection Act and the GDPR for diaspora readers.',
    sections: [
      {
        heading: 'What we collect',
        bullets: [
          'Account: email address, display name, password hash, optional roots/lineage, optional community role.',
          'Reading activity: saved tales, reading and listening progress, reactions, completion counts.',
          'Device data for offline downloads: a random per-browser id and which tales are downloaded where.',
          'Security data: refresh-session records (hashed tokens, user agent, IP) used to keep you signed in safely.',
        ],
        paragraphs: [],
      },
      {
        heading: 'Roots and lineage are optional',
        paragraphs: [
          'Tribe or lineage can reveal ethnic origin, which is special personal information under POPIA and the GDPR. We only collect it if you choose to share it, with explicit consent, and you can remove it at any time in your profile.',
        ],
      },
      {
        heading: 'Why we use it',
        paragraphs: [
          'To personalise your reading list, to keep your place across devices, to calculate your own reading statistics, and to keep accounts secure. We do not sell data and we do not run behavioural advertising.',
        ],
      },
      {
        heading: 'Analytics',
        paragraphs: [
          'Product analytics are off until you opt in. No analytics script loads before consent, and analytics events never contain personal data.',
        ],
      },
      {
        heading: 'Storage on your device',
        bullets: [
          'Your access token lives in memory only; the refresh token is an httpOnly cookie.',
          'Reading preferences, guest saves and downloaded tales are stored in your browser (localStorage, IndexedDB and Cache Storage) and can be cleared from Settings.',
        ],
        paragraphs: [],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You can access, correct and delete your data. Account export and deletion are being completed as part of the privacy workstream; until then, contact us and we will handle the request manually.',
        ],
      },
      {
        heading: 'Retention',
        paragraphs: [
          'Expired refresh tokens are deleted after seven days. Read-reading activity for deleted accounts is removed within 30 days. Operational logs are kept for 30 days.',
        ],
      },
    ],
  },
  {
    slug: 'community-guidelines',
    title: 'Community guidelines',
    updated: '15 November 2026',
    intro:
      'Tales are a form of inheritance. These guidelines keep the archive a place where that inheritance is treated with care.',
    sections: [
      {
        heading: 'Consent and provenance',
        paragraphs: [
          'Only submit tales you have the right to share. Name the tradition, the region and, where known, the teller who passed it to you.',
          'Do not reveal sacred or restricted stories. When in doubt, ask the elders in that community before submitting.',
        ],
      },
      {
        heading: 'Respect in retelling',
        paragraphs: [
          'Retell with honesty. Avoid caricature, invented “ancient” dialogue that erases living cultures, and imagery that reduces people to costume.',
        ],
      },
      {
        heading: 'What editors look for',
        bullets: [
          'A clear tale with a beginning, a turn and a wisdom.',
          'Respectful attribution and a coherent category and publication.',
          'Language that can be read aloud to a child and to an elder.',
        ],
        paragraphs: [],
      },
      {
        heading: 'Review process',
        paragraphs: [
          'Every submission is read by an editor. We may ask for changes, approve it as a draft for further editorial work, or decline it. You will always receive a note explaining an editorial decision.',
        ],
      },
    ],
  },
  {
    slug: 'copyright',
    title: 'Copyright and takedowns',
    updated: '15 November 2026',
    intro:
      'Traditional tales belong to the communities that carry them. The recordings, translations and artwork on this site belong to their creators.',
    sections: [
      {
        heading: 'Community submissions',
        paragraphs: [
          'Submitted tales are published under CC BY 4.0 unless the author states otherwise at submission. Attribution to the tradition and the teller is preserved on the tale page.',
        ],
      },
      {
        heading: 'Takedown requests',
        paragraphs: [
          'If you believe a tale, recording or image infringes your rights, contact the team with the story URL, the work you own and a short explanation. We respond within 72 hours and remove or restrict content while we investigate a credible claim.',
        ],
      },
      {
        heading: 'Reporting cultural harm',
        paragraphs: [
          'If a published tale misrepresents or exposes a community in a harmful way, report it with the same form. Cultural review takes priority over speed.',
        ],
      },
    ],
  },
];
