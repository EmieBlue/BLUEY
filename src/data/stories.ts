import type { Author, Chapter, Genre, Story } from './types';

/**
 * Local sample content. This is intentionally hand-written so the app feels
 * real while we build the UI. Later, these accessor functions become Supabase
 * queries and the screens won't have to change.
 */

const authors: Record<string, Author> = {
  rosa: {
    id: 'rosa',
    name: 'Rosa Delacroix',
    bio: 'Writes quiet fantasy about ordinary people in extraordinary woods.',
  },
  mensah: {
    id: 'mensah',
    name: 'K. A. Mensah',
    bio: 'Former detective turned crime novelist. Likes a locked room.',
  },
  tan: {
    id: 'tan',
    name: 'Junie Tan',
    bio: 'Science fiction about the small lives inside big machines.',
  },
  okafor: {
    id: 'okafor',
    name: 'Ada Okafor',
    bio: 'Love stories with sharp edges and soft landings.',
  },
};

function chapter(
  order: number,
  title: string,
  isPremium: boolean,
  paragraphs: string[],
): Chapter {
  const words = paragraphs.join(' ').split(/\s+/).length;
  return {
    id: `ch${order}`,
    order,
    title,
    isPremium,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    paragraphs,
  };
}

export const STORIES: Story[] = [
  {
    id: 'lantern-in-the-pines',
    title: 'The Lantern in the Pines',
    author: authors.rosa,
    format: 'serial',
    genres: ['Fantasy', 'Mystery'],
    blurb: 'A lamplighter follows a light that should not exist.',
    description:
      'Every winter the village of Hollowmere lights its lanterns against the dark. This year a new light burns deep in the pines — steady, patient, and waiting. Maren, the youngest lamplighter the village has ever named, is the only one who can see it. A slow-burning fantasy serial, updated weekly.',
    coverColor: '#2F6F4E',
    coverEmoji: '🏮',
    isComplete: false,
    rating: 4.7,
    readsCount: 18420,
    chapters: [
      chapter(1, 'The Light That Wasn’t Lit', false, [
        'Maren had lit three hundred and twelve lanterns in her life, and not one of them had ever frightened her until tonight.',
        'The cold in Hollowmere came down from the mountains like a tide, and against it the village kept its old bargain: every lantern lit by dusk, every flame fed until dawn. Her grandmother had taught her the rhythm of it — wick, spark, breath, move on — and Maren could walk the whole circuit in her sleep, which on the long nights she very nearly did.',
        'So when she reached the edge of the pines and saw a light already burning where no lantern stood, her hands forgot the rhythm entirely.',
        'It was the wrong color. Village flame was warm and yellow, the color of butter and safety. This light was pale, almost green, and it did not flicker the way fire flickers. It simply waited, deep among the trunks, as if it had been left on for her.',
        '“Hello?” she called, and felt foolish at once. Lights do not answer. But this one, impossibly, grew a little brighter — the way a person leans forward when they have finally been seen.',
      ]),
      chapter(2, 'What the Snow Remembers', false, [
        'In the morning Maren told no one. There was no one to tell who would believe her, and several who would worry, which was worse.',
        'Instead she went back to the tree line in daylight, when the woods were only woods and the snow lay clean and unbothered. She found the spot easily — she had not slept for thinking of it — and there, pressed into the drift, were footprints leading away into the pines.',
        'They were her size. They were, she realized with a slow cold horror that had nothing to do with the weather, exactly her size, down to the worn left heel of her own boots. But she had not stepped off the path. She was certain she had not stepped off the path.',
        'The snow, it seemed, remembered something she did not.',
      ]),
      chapter(3, 'The Keeper of the Far Lamp', true, [
        'The figure at the heart of the pines was not a ghost, though Maren had prepared herself for a ghost and felt almost cheated.',
        'He was old in the way the trees were old — not frail, but layered, as though many winters had been folded into one man and pressed flat. He held the pale lantern without seeming to hold it at all.',
        '“You came back,” he said. “They usually don’t. They tell themselves it was a trick of the cold.” He studied her with eyes that caught the green light and kept it. “But you’re a lamplighter. You can’t leave a flame unexplained. It itches.”',
        'Maren’s mouth was dry. “What are you keeping lit out here?”',
        'The old man smiled, and for the first time the lantern flickered — once, like a held breath finally let go. “The way back,” he said. “For everyone Hollowmere has ever lost. Someone has to keep it burning. My hands are getting tired, child. I have been hoping, for a very long time, that someone with steady hands might come and see.”',
      ]),
      chapter(4, 'Steady Hands', true, [
        'There is a moment in every apprenticeship where the teacher stops explaining and simply hands you the work. Maren had felt it before, the night her grandmother pressed the village taper into her palm and stepped back.',
        'She felt it now, in the dark of the pines, as the old keeper held out the pale lantern and waited.',
        '“If I take it,” she said slowly, “can I put it down again?”',
        '“That,” he said, “is the only honest question anyone has ever asked me out here. And the answer is yes — but you won’t want to. That is the trick of it. Not the weight. The wanting.”',
        'Maren looked back the way she had come, toward the warm and ordinary lights of home, each one lit by her own hand. Then she looked at the cold green flame that lit the way to everywhere else. She thought about her grandmother. She thought about all the names the village said quietly and never expected to say again.',
        'She reached out.',
      ]),
    ],
  },
  {
    id: 'glasshouse-murders',
    title: 'The Glasshouse Murders',
    author: authors.mensah,
    format: 'serial',
    genres: ['Mystery', 'Thriller'],
    blurb: 'Three guests. One locked greenhouse. No way in or out.',
    description:
      'When botanist Iris Vale is found dead inside a greenhouse locked from the inside, Inspector Cole has a problem: the only three people with keys all have alibis, and the orchids aren’t talking. A complete, three-part locked-room mystery.',
    coverColor: '#7A3B69',
    coverEmoji: '🔍',
    isComplete: true,
    rating: 4.5,
    readsCount: 9650,
    chapters: [
      chapter(1, 'A Door That Only Locks From Within', false, [
        'The greenhouse had one door, and that door had been bolted from the inside. Inspector Cole had confirmed it twice, because the first time he had not believed it either.',
        'Iris Vale lay among her orchids as though she had simply decided to rest there. No wound he could see. No struggle. The humid air held the green smell of growing things and, underneath it, something sharper he could not yet name.',
        '“Three people had keys,” said the constable. “The husband, the assistant, and the gardener. All three were somewhere else. We checked.”',
        'Cole crouched by the body and looked, for a long moment, at the single orchid clutched in her hand — a flower he was fairly sure had not been blooming anywhere else in the room.',
      ]),
      chapter(2, 'Everyone Has an Alibi', false, [
        'The husband had been at his club, witnessed by twelve men and a great deal of brandy. The assistant had been on a train, ticket stamped. The gardener had been in the village pub until closing, loudly and memorably.',
        '“It’s a good problem,” Cole admitted to the constable, “when everyone can prove where they were. It means someone went to a great deal of trouble. People only build alibis that neat when they expect to need them.”',
        'He spread the three keys on the table. Identical brass, identical teeth. Except — he held one to the light — one of them was very slightly warm, as though it had been carried close to the body, in a pocket, all evening.',
      ]),
      chapter(3, 'The Flower That Told the Truth', false, [
        'It was the orchid that undid them in the end.',
        'Iris Vale had been cultivating a single impossible hybrid, a flower that bloomed for one hour a year. She had told exactly one person the night it would open. That person had come to see it — not to kill her, perhaps, but to take it — and in the small struggle that followed, a sealed room had become a sealed tomb.',
        '“You locked it behind you,” Cole said quietly, “out of habit. She always locked it. You’d watched her do it a hundred times. You weren’t thinking about an alibi. You were thinking about the flower.”',
        'The assistant’s hands, which had been so steady all week, finally began to shake.',
      ]),
    ],
  },
  {
    id: 'last-train-to-vega',
    title: 'Last Train to Vega',
    author: authors.tan,
    format: 'serial',
    genres: ['Sci-Fi'],
    blurb: 'A night-shift conductor on a train between stars.',
    description:
      'The Vega Line runs once a decade, carrying sleepers across thirty light-years while they dream. Sol is the only one awake — the conductor, the witness, the keeper of other people’s journeys. Then a passenger wakes up early. An ongoing space serial.',
    coverColor: '#2B4C7E',
    coverEmoji: '🚆',
    isComplete: false,
    rating: 4.6,
    readsCount: 12030,
    chapters: [
      chapter(1, 'Awake', false, [
        'There are four hundred sleepers aboard the Vega Line and exactly one person awake to mind them, and for nine years that person has been Sol.',
        'It is not a lonely job, Sol tells the recruiters, which is a lie everyone agrees to. It is the loneliest job that exists. You walk the long aisle between the pods and you watch four hundred faces dream, and you keep the lights low, and you do not — you must not — open any of them early.',
        'On the three-thousand-and-first night, pod 114 begins, very softly, to chime.',
      ]),
      chapter(2, 'The Passenger Who Shouldn’t Be', true, [
        'Her name, according to the manifest, was Ren, and she was not due to wake for another six years.',
        '“How long have I been under?” she asked, before she had even fully sat up. It was the right question. Most early-wakers asked where they were. The good ones asked when.',
        '“Three years,” Sol said. “You’ve got six to go. The pod shouldn’t have opened. I need to know if you touched anything before you slept.”',
        'Ren looked at her hands as though they belonged to someone else. “I don’t think I went to sleep at all,” she said. “I think I was put to sleep. There’s a difference. And I think,” she added, meeting Sol’s eyes, “that you already know that, or you wouldn’t be whispering.”',
      ]),
      chapter(3, 'What the Manifest Left Out', true, [
        'Sol had read the manifest a thousand times on a thousand quiet nights. Four hundred names, four hundred destinations, four hundred small stories paused mid-sentence.',
        'What Sol had never done was count them.',
        'They counted now, together, pod by pod down the long cold aisle, and when they reached the end the number was four hundred and one. One more sleeper than the manifest admitted. One more face that no one was supposed to be awake to see.',
        '“We are not going to Vega,” Ren said softly. “Are we.”',
        'Sol did not answer. The lights hummed. The extra pod, far down the aisle, began very softly to chime.',
      ]),
    ],
  },
  {
    id: 'salt-and-other-cures',
    title: 'Salt and Other Cures',
    author: authors.okafor,
    format: 'standalone',
    genres: ['Literary', 'Romance'],
    blurb: 'Two strangers, one storm, and a seaside town that keeps secrets in brine.',
    description:
      'A complete short story. When a storm strands a grieving chef in a town that preserves everything — fish, fruit, grudges, love — she finds the one recipe she never learned to make: starting over.',
    coverColor: '#C26B3E',
    coverEmoji: '🧂',
    isComplete: true,
    rating: 4.8,
    readsCount: 24110,
    chapters: [
      chapter(1, 'Salt and Other Cures', false, [
        'The town cured everything in salt, including, Naomi suspected, its own people. They had that look — preserved, a little too well kept, as though nothing here ever quite spoiled and nothing ever quite ripened either.',
        'She had not meant to stop. The storm had stopped her, the way storms do, folding the road into the sea somewhere behind her and leaving only this: a harbor, a shuttered inn, and a man on the dock mending nets in the rain as though the rain were a minor disagreement he expected to win.',
        '“Kitchen’s closed,” he said, without looking up. “But the kettle isn’t.” And that, in the end, was the whole of how it began — not with a recipe, but with someone offering her something warm before she had to ask.',
        'Naomi had spent two years cooking for a man who was no longer alive to taste it. She had salted everything those two years, she realized now, watching the harbor blur. Preserving meals he would never come home for. Keeping things that were already gone.',
        'The man set the kettle down between them and finally looked at her — not with pity, which she had grown to hate, but with the plain curiosity of someone who had all the time in the world and no particular need to fill it.',
        '“You can stay till it passes,” he said. The storm, he meant. But she heard the other thing underneath it, the thing this whole salt-kept town seemed to know how to say without saying: some things, if you tend them right, keep. And some things are meant, at last, to be let go.',
      ]),
    ],
  },
  {
    id: 'letters-we-never-sent',
    title: 'Letters We Never Sent',
    author: authors.okafor,
    format: 'standalone',
    genres: ['Romance'],
    blurb: 'A box of unsent letters, found forty years too late.',
    description:
      'A complete short story, available to subscribers. When Tomas inherits his late grandmother’s house, he finds a shoebox of letters addressed to a man no one in the family has ever heard of — all written, none sent.',
    coverColor: '#A23E54',
    coverEmoji: '💌',
    isComplete: true,
    rating: 4.9,
    readsCount: 15780,
    chapters: [
      chapter(1, 'Letters We Never Sent', true, [
        'The shoebox was at the back of the wardrobe, behind the good coat his grandmother had been saving, his whole life, for an occasion that apparently never came.',
        'Inside were forty-one letters, tied with a ribbon gone soft as cloth. Each was addressed in his grandmother’s careful hand to a man named Aurelio, at an address in a city she had, to Tomas’s knowledge, never once visited. None of them had stamps. None had been opened, because none had ever been sent.',
        'He read the first one sitting on the floor of the empty bedroom, and by the third he understood that he had known his grandmother for thirty years and not at all.',
        '“My dear Aurelio,” the first one began. “I am marrying him on Sunday. He is kind, and I will be a good wife, and I am writing to you instead of to my own heart because my heart, I find, will not listen to reason. This is the last foolish thing I will allow myself. After this, I will be sensible for the rest of my life.”',
        'There were forty more. She had not, it turned out, managed to be sensible at all. She had simply learned to keep her foolishness in a box, and to love a man named Aurelio quietly, in unsent letters, for forty years — while loving the kind man she married out loud, every single day.',
        'Tomas sat for a long time in the dust and the late light. Then he did the only thing that seemed right. He found the fortieth letter, the one dated just weeks before she died, and he read the last line his grandmother ever wrote to a man she never sent a word to: “If you are reading this, then someone braver than I was has finally posted it. Be kind to them. They have just learned that love is mostly the things we never said.”',
      ]),
    ],
  },
  {
    id: 'weight-of-small-hours',
    title: 'The Weight of Small Hours',
    author: authors.tan,
    format: 'standalone',
    genres: ['Literary'],
    blurb: 'A night nurse, an insomniac city, and the things people confess at 3 a.m.',
    description:
      'A complete short story. On the quietest ward of a sleepless hospital, the things patients say between midnight and dawn are not the things they say in daylight. A nurse learns to carry them.',
    coverColor: '#3F5E5A',
    coverEmoji: '🌙',
    isComplete: true,
    rating: 4.4,
    readsCount: 6240,
    chapters: [
      chapter(1, 'The Weight of Small Hours', false, [
        'Between midnight and four, the hospital tells the truth. Priya has worked the night shift long enough to know the schedule of honesty: visitors gone, painkillers settling, the daylight performance of being fine finally too heavy to hold up.',
        'That is when they talk. Not about their charts. About the brother they haven’t called in nine years. About the thing they said to their daughter that they would give a lung to take back. About being afraid, plainly, the way children are afraid, of the dark and of the morning both.',
        'Priya does not fix any of it. She has learned that this is not the job, though it took her years to believe it. The job is simply to be awake when they are, to hold the small hours steady so the confessions have somewhere to land.',
        '“Will you remember what I said?” old Mr. Adeyemi asks her, near the end of his last night, and she takes his hand and tells him the truest thing she knows: “I remember all of it. That’s what I’m here for. You can put it down now. I’ve got it.”',
      ]),
    ],
  },
];

// --- Pure lookups over a stories array --------------------------------------
// The StoriesProvider loads the array (from Supabase, or the local STORIES
// fallback) and binds these. Screens call the bound versions via
// useStoriesData() instead of importing these directly.

export function getStoryById(stories: Story[], id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}

export function getChapter(
  stories: Story[],
  storyId: string,
  chapterId: string,
): { story: Story; chapter: Chapter } | undefined {
  const story = getStoryById(stories, storyId);
  if (!story) return undefined;
  const chapter = story.chapters.find((c) => c.id === chapterId);
  if (!chapter) return undefined;
  return { story, chapter };
}

/** The single hero story shown at the top of Home (undefined if there are none). */
export function getFeaturedStory(stories: Story[]): Story | undefined {
  return stories[0];
}

export function getPopularStories(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => b.readsCount - a.readsCount);
}

export function getStoriesByGenre(stories: Story[], genre: Genre): Story[] {
  return stories.filter((s) => s.genres.includes(genre));
}

export function searchStories(stories: Story[], query: string): Story[] {
  const q = query.trim().toLowerCase();
  if (!q) return stories;
  return stories.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.author.name.toLowerCase().includes(q) ||
      s.blurb.toLowerCase().includes(q) ||
      s.genres.some((g) => g.toLowerCase().includes(q)),
  );
}

/** The chapter before/after the given one, or undefined at the ends. */
export function getAdjacentChapter(
  stories: Story[],
  storyId: string,
  chapterId: string,
  direction: 'next' | 'prev',
): Chapter | undefined {
  const story = getStoryById(stories, storyId);
  if (!story) return undefined;
  const index = story.chapters.findIndex((c) => c.id === chapterId);
  if (index === -1) return undefined;
  const target = direction === 'next' ? index + 1 : index - 1;
  return story.chapters[target];
}

export function hasPremiumChapters(story: Story): boolean {
  return story.chapters.some((c) => c.isPremium);
}

/** Human-friendly reads count, e.g. 18420 -> "18.4k". */
export function formatReads(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}
