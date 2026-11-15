#!/usr/bin/env node
/**
 * Builds `content/stories/<slug>.json` from the plain-paragraph source below.
 *
 * The JSON files are the committed deliverables; this script exists so paragraph IDs (p_01…),
 * sentence IDs (s_0001…), word counts and word/sentence hygiene are deterministic and reviewable.
 *
 * Run: node content/scripts/build-stories.mjs
 *   or: node content/scripts/build-stories.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { buildStoryBody, countWords } = require('../../packages/shared/dist/index.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'content', 'stories');

const ACCENT = {
  zulu: '#B4472C',
  shona: '#C4692F',
  yoruba: '#D08A2E',
  ashanti: '#A8502F',
  maasai: '#C0562E',
  dogon: '#8C5A3C',
  'san-khoikhoi': '#B9773A',
  kuba: '#9C4A2E',
  tonga: '#A9682F',
  igbo: '#7C4A2E',
  xhosa: '#A34F31',
  mandinka: '#B8742C',
  kikuyu: '#BF6A2F',
  amhara: '#8E4B2A',
  oromo: '#A85E2C',
  hausa: '#B1813A',
};

/** @type {Array<{
 *   slug: string, title: string, summary: string, moral: string, tribeSlug: string,
 *   categorySlug: string, narratorSlug: string, publishedAt: string,
 *   isFeatured?: boolean, popularityScore: number, paragraphs: string[], coverAlt: string,
 *   attributionName: string,
 * }>} */
const stories = [
  {
    slug: 'when-the-chameleon-carried-the-word',
    title: 'When the Chameleon Carried the Word',
    summary:
      'uNkulunkulu sends the slow chameleon with a word of life, but a hurried lizard runs ahead with another word that changes everything.',
    moral: 'A word carried in haste cannot be called back; a gentle word outlives it.',
    tribeSlug: 'zulu',
    categorySlug: 'creation',
    narratorSlug: 'thandiwe-nkosi',
    publishedAt: '2026-11-14T06:00:00.000Z',
    isFeatured: true,
    popularityScore: 0.94,
    coverAlt:
      'A slow chameleon on a branch before a wide saffron sun, with hills layered in terracotta',
    attributionName: 'Zulu',
    paragraphs: [
      'In the beginning, before the rivers had learned their courses and before the hills had been given their names, uNkulunkulu looked down from above the sky. He saw a wide world, and on it were people, and they were quiet. Their tongues had no stories in them yet, and they did not know why they had been made.',
      'uNkulunkulu called the chameleon to his side. The chameleon was slow-footed and patient, and it wore the colours of leaves and stone so well that the wind could pass by without noticing it. “Carry a word to the people,” uNkulunkulu said. “Tell them that they will live, and that the grave will not keep them.”',
      'The chameleon nodded and set off down the long road, one careful foot after another. It did not run. It stopped to look at the sky. It greeted an old tortoise and listened to the water in the valley. The world was new, and the chameleon saw no reason to hurry past it.',
      'Now the lizard had been watching from the shade of a flat rock, and it was not pleased. “The chameleon will take a whole season to arrive,” the lizard said to itself. “The people will still be waiting when the mountains grow old. I will run ahead and make myself useful.”',
      'So the lizard ran, quick as a thrown stone, down the hills and through the valleys. It reached the people before the chameleon had even crossed the first river. “Listen!” the lizard cried. “The word has been given to me. You will live for a while, and then you will die, and the earth will take you back.”',
      'The people wept. They had never heard of death before, and the idea of it moved through them like a cold wind. That night they built their first fires to keep the darkness from coming too close, and the old ones began to count the days.',
      'The chameleon was late because it had stopped to eat a fruit that hung low over the path. It was still chewing when it heard the people wailing. “What has happened here?” it asked, and the lizard flicked its tail and looked away.',
      'When the chameleon finally stood before the people, it told them the word it had been given: that they would live, and that the grave would not keep them. But the people had already taken the other word into their mouths, and a word spoken over a whole people is not easily called back.',
      'uNkulunkulu heard the weeping and understood what had been done. He did not strike the lizard down, and he did not make the chameleon run faster. He looked at the people for a long time, and then he said, “If death will walk with them, then let life walk closer.”',
      'So the people learned to hold two things at once. They learned that they would die, and they learned that this was exactly why a bowl of food shared at dusk, a child’s first laugh and a story told beside the fire were precious. They began to give each other what they had, and to say the names of those who had gone.',
      'When an old person died, the people did not only weep. They sat together and told the story of the word that had been carried badly, and then they told the story of the person’s life, with all its small kindnesses set out in order. In this way death taught them to remember, and remembering taught them to be gentle with one another.',
      'The chameleon still walks slowly, changing colour as it goes. Some say it is still carrying the first word, looking for a time and a people patient enough to hear it. Others say it is only looking for the fruit it never finished. Either way, it is in no hurry, and the world has not yet run out of people who need the message.',
      'That is why the old people say: do not hurry a gentle thing. A word carried in peace can outlive a word carried in haste, and a people who remember death will make room for life.',
    ],
  },
  {
    slug: 'unogwaja-and-the-lions-well',
    title: 'uNogwaja and the Lion’s Well',
    summary:
      'The hare shows a boastful lion his own reflection in a deep well, and frees the animals of the valley without raising a single claw.',
    moral: 'The one who laughs at a reflection may fall into the water beneath it.',
    tribeSlug: 'zulu',
    categorySlug: 'animal',
    narratorSlug: 'thandiwe-nkosi',
    publishedAt: '2026-10-29T06:15:00.000Z',
    popularityScore: 0.7,
    coverAlt: 'A hare beside a dark round well while a lion’s silhouette leans over the water',
    attributionName: 'Zulu',
    paragraphs: [
      'The lion of the valley had grown tired of hunting. He declared that all the animals must come to his cave each morning and bow, and that he would choose one of them for his meal. The animals were afraid, so they came, and each morning one of them did not go home.',
      'uNogwaja the hare listened to the weeping and thought about the lion for three days. Then he walked to the cave and bowed lower than anyone. “Great one,” he said, “there is another lion in this valley, a larger one, and he says the water in the well belongs to him and not to you.”',
      'The lion roared until the leaves shook. “Show me this lion,” he demanded. uNogwaja led him to the old stone well at the edge of the grass. The water lay still and dark at the bottom, and when the lion leaned over, a great golden face looked back at him.',
      '“You see?” said the hare quietly. “He is copying you. He is even opening his mouth the way you do.” The lion growled, and the reflection growled. The lion swiped at it with one paw, and the reflection swiped back, and the lion could not bear to be mocked.',
      'He leapt into the well to teach the other lion a lesson. There was a great splash, and a great wet roar, and then only the sound of water finding its level again. uNogwaja sat at the edge and combed his whiskers. “A little closer,” he said to no one in particular, “is a dangerous place to stand.”',
      'The animals came to the well at sunset and saw that the lion was gone. The hare did not take any credit. He only told them that a boastful lion had met a very patient one, and that from that day the well belonged to everyone.',
    ],
  },
  {
    slug: 'the-grain-left-standing',
    title: 'The Grain Left Standing',
    summary:
      'A farmer leaves a corner of his field unharvested, and his mocking neighbour learns what the birds and the dry season know.',
    moral: 'Leave something for the ground, the birds and the neighbour who comes after you.',
    tribeSlug: 'shona',
    categorySlug: 'wisdom',
    narratorSlug: 'thandiwe-nkosi',
    publishedAt: '2026-10-24T06:00:00.000Z',
    popularityScore: 0.58,
    coverAlt: 'Rows of golden grain holding their heads high beside a low thatched granary',
    attributionName: 'Shona',
    paragraphs: [
      'Tafara had the best field on the highveld: rich red soil, and rain that seemed to find it first. Each harvest, when the other farmers stripped their fields to the last stalk, Tafara walked along the edge of his and left a broad strip of grain standing.',
      'His neighbour, Chikomo, laughed at him. “Are your eyes tired of looking at your own harvest, that you cannot be bothered to finish it?” he called across the boundary. “Next year you will have nothing left to eat, and your birds will remember you fondly.”',
      'Tafara answered politely and kept on leaving the strip. The birds came, as birds will, and the field mice, and the insects that had nowhere else to go. The grain gave them shade and seed, and the roots of the standing stalks held the soil when the first heavy rains came.',
      'That year the rains came late and then all at once. Chikomo’s bare field washed downhill in a wide brown sheet, carrying his seed and his soil with it. Tafara’s field held. The strip that had been left standing slowed the water, and the earth beneath it stayed where it belonged.',
      'When the dry weeks came, the birds that had been fed in Tafara’s field moved across the farmland and picked the beetles from every crop, including Chikomo’s. The harvest was not one man’s harvest that year; it belonged to the valley, and the valley knew who had left something for it.',
      'Chikomo came to ask Tafara how he knew to do this. Tafara shook his head. “I did not know,” he said. “My father left a strip, and my grandmother left a strip before him. A field is not a warehouse. It is a friend, and a friend is given something to keep.”',
    ],
  },
  {
    slug: 'ijapa-and-the-feast-above-the-clouds',
    title: 'Ìjàpá and the Feast Above the Clouds',
    summary:
      'Ìjàpá the tortoise borrows a feather from every bird to attend a feast in the sky, and learns that a borrowed kindness comes with a price.',
    moral: 'A feast eaten alone leaves a shell cracked where all can see.',
    tribeSlug: 'yoruba',
    categorySlug: 'trickster',
    narratorSlug: 'adewale-okunola',
    publishedAt: '2026-11-11T07:30:00.000Z',
    isFeatured: true,
    popularityScore: 0.91,
    coverAlt:
      'A flock of birds rising in a dark V above a tortoise whose shell shows a bright crack',
    attributionName: 'Yoruba',
    paragraphs: [
      'There was once a feast in the sky, and every bird in the world was invited. The tortoise Ìjàpá heard about it from the parrot, who could not keep a secret unless it was told he had no wings at all.',
      '“Take me with you,” Ìjàpá said. “I have no wings, but I have a very good name, and a very good name is worth more than a pair of wings at a party.” The parrot looked at the tortoise’s round back and sighed. “I will ask the others,” he said. “But you must not eat before speaking, or you will spoil your name.”',
      'The birds each lent Ìjàpá one feather. They tucked them into the edges of his shell until he was a strange, heavy bird. He looked at his new wings in a puddle and liked them very much. He gave each bird a name to remember him by, which is how the birds got the names they still use for one another.',
      'They flew up, higher and higher, until the ground below looked like a cloth laid out for washing. Ìjàpá held on. He did not look down, and he did not look up, and he did not say a single word, which was difficult for him.',
      'At the feast in the sky, the food was poured into calabash bowls. The birds gathered round. But Ìjàpá had brought a stool and a little bag of chalk, and he gave each bird a chalk mark on the ground. “You must not begin,” he said, “until the one who has no wings gives the blessing. It is the custom of my people.”',
      'The birds waited politely. The food smelled of palm oil and pepper and smoke, and the smell reached down into Ìjàpá’s round belly and made a noise there. He blessed the food, and then, because the blessing was in his mouth, he ate first. He ate first and second and third. He ate as though he had been empty since the world was made.',
      'The birds watched. They watched until Ìjàpá began to leak, as tortoises do when they have eaten too much. Then they were no longer polite. They went to every bird and took back the feather that had been lent, and the parrot, who had arranged the whole thing, took his back last and took it slowly.',
      'Ìjàpá looked at himself: round, heavy, and without a single wing. “Then I shall tell the sky people a story,” he said, “and they will give me a second feast while you go home.” But the sky people had already heard the birds, and they were not pleased.',
      'The birds flew home and left Ìjàpá alone in the clouds. They flew in a long dark line across the evening, and not one of them looked back. The sky people shut their doors. The feast was over, and the bowls were being washed, and there was no one left in the sky who wanted to hear a story from a tortoise with no feathers.',
      'The parrot felt sorry for him and swooped back. “I cannot carry you,” he said, “but I can soften the ground for you.” So he flew to Ìjàpá’s wife and told her to pile up every soft thing in the house under the place where her husband would fall: the cushions, the mats, the cloths, the cotton.',
      'Some of it was soft. Much of it was not. Ìjàpá fell and fell, and when he struck the ground his beautiful shell split into more pieces than a market trader could count. He lay there for a long time, hummocked and gaping.',
      'His wife came running with a needle and thread, and she sewed the shell back together while the neighbours gathered to look. She sewed well, but she could not find the piece that had held the middle of his back, so his shell has been cracked and ribbed ever since.',
      'That is why the tortoise never comes to a feast empty-handed, and never goes anywhere he cannot leave on his own feet. And that is why people say: a feast eaten alone leaves a shell cracked where all can see.',
    ],
  },
  {
    slug: 'obatala-and-the-chain-of-the-sky',
    title: 'Obatala and the Chain of the Sky',
    summary:
      'Obatala climbs down the golden chain with a calabash of sand and a rooster, and the first dry land rises out of the water.',
    moral: 'The world is made by those who climb down and begin.',
    tribeSlug: 'yoruba',
    categorySlug: 'creation',
    narratorSlug: 'adewale-okunola',
    publishedAt: '2026-11-04T06:00:00.000Z',
    popularityScore: 0.64,
    coverAlt:
      'A golden chain hanging from the sky to a mound of earth, with a calabash and a white rooster beside it',
    attributionName: 'Yoruba',
    paragraphs: [
      'In the beginning, the world was water and the sky was above it, and Olodumare, the owner of the sky, looked down and saw that below there was no place to stand. He called Obatala, who was thoughtful and careful, and told him to go and make land.',
      'Obatala was given a golden chain, a calabash holding a handful of sand, and a white rooster with a strong voice. The chain was lowered and lowered until it hung across the empty water, and Obatala climbed down with the calabash on his shoulder and the rooster under his arm.',
      'When he reached the end of the chain, he poured the sand onto the water. The rooster scratched at it and spread it with its feet. The sand grew. It spread out in every direction, and places appeared where a person could stand: a hill, a plain, the muddy beginning of a shore.',
      'Obatala climbed back up the chain for more sand, but he had already travelled far. Some say he grew tired. Some say he stopped at a place where palm wine was waiting, and that this is why the land is not perfectly flat. However it happened, the making of the world was slowed, and Obatala’s helpers took up the work.',
      'Still, the land was made. The chain was left hanging between sky and earth, and the first people came down it, one after another, finding their footing on the world Obatala had begun. They learned to plant, to build, and to greet the morning.',
      'The old ones say the chain is still there, though no eye has ever seen it since. They say every person who begins something difficult is climbing it. Land is made by those who climb down and begin, not by those who stand at the top and argue about the water.',
    ],
  },
  {
    slug: 'anansi-and-the-pot-of-wisdom',
    title: 'Anansi and the Pot of Wisdom',
    summary:
      'Anansi is given a pot holding all the wisdom in the world, and discovers that the pot is much easier to fill than it is to carry.',
    moral: 'Wisdom carried alone is a pot too heavy for one back.',
    tribeSlug: 'ashanti',
    categorySlug: 'trickster',
    narratorSlug: 'kofi-mensah',
    publishedAt: '2026-10-19T07:00:00.000Z',
    popularityScore: 0.81,
    coverAlt:
      'A spider with a clay pot climbing a tall tree, web lines radiating across the forest',
    attributionName: 'Ashanti',
    paragraphs: [
      'Nyame, the sky god, kept all the wisdom in the world in a clay pot. Anansi the spider came to the sky and talked so long and so well that Nyame agreed to lend him the pot. “Only mind you do not spill it,” said Nyame, “for there is no second pot.”',
      'Anansi carried the pot home and put it on the ground very carefully. He sat down beside it and thought about how he was now the wisest creature in the world. Then he thought that he should hide the pot where no one else could find it, and he decided that a very tall tree was the best hiding place in the forest.',
      'He tied the pot to his stomach and began to climb. But a spider climbing a tree with a pot on his stomach can only see his own feet, and his feet were behind the pot. He slipped. The pot swung. He gripped with three legs and could not move. He tried to climb with the pot on his back, and could not do that either, because his back was a spider’s back.',
      'His small son, Ntikuma, came along the path and watched him for a while. “Father,” he said at last, “why do you not tie the pot behind you, and climb face-up, so that you can see where you are going?”',
      'Anansi stopped. He was furious, because the advice was good and it had come from a child who still had his first teeth. He was so angry that he dropped the pot. It broke on the roots of the tree, and every scrap of wisdom in the world scattered into the forest.',
      'Now wisdom is not lost. It lies where it fell: in the roots, in the riverbank, in the market, in the mouths of children. That is why no one person has all of it, and why we must keep telling stories to one another, if only to collect what the pot spilled.',
    ],
  },
  {
    slug: 'the-acacia-and-the-herdsmans-promise',
    title: 'The Acacia and the Herdsman’s Promise',
    summary:
      'A young herder promises the acacia a share of every milking if the tree will shade his cattle through the long dry season.',
    moral: 'A promise given to a tree is still a promise.',
    tribeSlug: 'maasai',
    categorySlug: 'folklore',
    narratorSlug: 'naserian-leltika',
    publishedAt: '2026-10-14T06:30:00.000Z',
    popularityScore: 0.77,
    coverAlt:
      'A flat-topped acacia against a wide sun, with cattle silhouettes crossing the savanna',
    attributionName: 'Maasai',
    paragraphs: [
      'When the long dry season came, the grass turned the colour of old rope and the waterholes shrank from one valley to the next. A young herder named Lelesiit drove his cattle far from home, searching for a place where they could rest.',
      'At noon, he found one tree with a wide flat crown, an acacia that spread its branches like a roof. He stopped beneath it and let the cattle shade themselves. The tree stood at the edge of a dry and ancient watercourse, and its shadow was the only cool thing for a day’s walk in any direction.',
      'The herder was grateful, and he was also afraid, because a man alone with thirsty cattle gives promises easily. He poured a little milk at the foot of the tree and said, “If you keep my herd alive until the rains, a share of every milking will be yours, and my children will know your name.”',
      'The acacia did nothing that a tree can do. It held its shade. The herd rested and did not lose flesh, and on the third night the clouds built up and the rain came down out of the dark. The cattle drank, and the grass came up green through the dust.',
      'When the herder returned home, he remembered his promise. Some of the other men laughed at him. “It is only a tree,” they said. “Save your milk.” But Lelesiit poured a little of every milking at the root of the acacia near his home, and he told his children to do the same.',
      'And the acacia has never lost its thorns, and has never needed anyone’s thanks, but it still opens its branches wide for the herds. The old people say this is why a promise must be kept even when the one you promised it to can never ask you to keep it.',
    ],
  },
  {
    slug: 'the-fox-who-read-the-sand',
    title: 'The Fox Who Read the Sand',
    summary:
      'A hunter follows the pale fox down to the cliffs and learns to read the tracks that the wind leaves in the sand.',
    moral: 'The world writes down what it knows; only the patient learn to read it.',
    tribeSlug: 'dogon',
    categorySlug: 'folklore',
    narratorSlug: 'amina-diallo',
    publishedAt: '2026-10-08T06:00:00.000Z',
    popularityScore: 0.52,
    coverAlt:
      'A pale fox crossing patterned sand beneath a grid of stars and a dark cliff silhouette',
    attributionName: 'Dogon',
    paragraphs: [
      'The Dogon country is a country of stone and sand, where the cliffs of Bandiagara stand above the plain like a wall built before memory. The old people say that in the earliest days the pale fox walked there alone, and that it always walked at an angle to the paths of everyone else.',
      'A hunter was following a trail of antelope tracks one evening when he saw the first prints of the fox. The tracks crossed and recrossed, went down into a dry gully and came up again without ever leading to a den. The hunter followed them until the light began to fail.',
      'At the foot of the cliff he found the fox sitting on a flat stone, watching him. The fox did not run. It lifted one paw, drew it through the sand in a slow curved line, and then sat back as if it had asked a question.',
      'The hunter had never learned to read anything but the tracks of animals he wished to eat. He knelt and looked at the line in the sand for a long time. Then he saw that the curve was the shape of the dry gully, and the small dots beside it were the places where water had once stood.',
      'The fox rose and walked on. The hunter followed it for the rest of the night, and by morning he understood a little of what the old people meant: the sand keeps a record of what has passed, and the fox is only reading it aloud.',
      'After that the hunter became one of the men who are consulted on questions, because he could look at a patch of ground and say where the herd had gone and when. He never claimed to be wise. He said only that he had learned to listen to the ground, and that the fox had been the first teacher.',
    ],
  },
  {
    slug: 'the-mantis-and-the-eland',
    title: 'The Mantis and the Eland',
    summary:
      'A dreamer of the old Karoo hears how ǀKaggen the Mantis shaped the first eland from earth, honey and the last of the day, and why it must be met with care.',
    moral: 'What is shaped with wonder deserves to be met with wonder.',
    tribeSlug: 'san-khoikhoi',
    categorySlug: 'animal',
    narratorSlug: 'naledi-molefe',
    publishedAt: '2026-11-07T06:00:00.000Z',
    isFeatured: true,
    popularityScore: 0.88,
    coverAlt:
      'A great eland standing in low golden dunes before a pale sun, a small mantis on a rock nearby',
    attributionName: 'San / Khoikhoi',
    paragraphs: [
      'Long before the cattle came, when the country was a wide brown sea of sand and thorn, ǀKaggen the Mantis was walking. He walked on his four thin legs with his head turned to one side, because he was always listening for something interesting.',
      'In a hollow beside a dry pan he found a little earth, and a little honey, and the pale light that the sun leaves on the stones at evening. “I am in the mood to make something,” he said, and he began to work. He worked the way the Mantis always worked: quickly, and with a great deal of interest in the result.',
      'He pressed the earth into a shape. He gave it a long neck, and a proud chest, and horns that turned like the branches of a young tree. He breathed on it, and it became warm. “Get up,” he said. “You are the eland.”',
      'The eland stood up. It was the most beautiful creature the Mantis had ever seen, and the Mantis was so pleased that he sat down and looked at it for the rest of the day. He called it by name, and the name was a sound like rain. The other animals came to the edge of the pan to look, and even they were quiet.',
      'Word of the eland travelled. The people came from far places to see it, and a young hunter named ǂXo decided that such an animal would make him famous. He took his bow and followed the eland into the dunes.',
      'The Mantis saw him going and grew afraid. “Do not hurry,” he told the hunter. “That creature was not made to be taken by whoever is quickest. It was made to be seen. If you would hunt it, learn its ways first.”',
      'ǂXo did not listen at once. He followed the eland for three days, and each evening he found that it had moved in a wide, slow circle and had not gone far at all. It grazed where the first green shoots came up after the rain, and its tracks always led back towards the water. It never hurried, and it never hid.',
      'On the fourth morning the eland stood on a rise and looked at him. ǂXo put down his bow. He could not say afterwards why he did it. He only knew that the animal was too beautiful to be killed for a boast, and that a thing so beautiful was not his to waste.',
      'The Mantis came out from behind a bush. “Now you have learned something,” he said. “The eland was made for the people, but only for those who approach it with respect. It is a creature of the rain, and the rain is not anyone’s servant.”',
      'So the people learned the old ways of the eland: when to follow, when to wait, which parts to use and which to leave, and how to speak of the animal afterwards with thanks. The Mantis watched them from a stone and nodded, the way an old teacher nods when the lesson has finally arrived.',
      'Children were taught to watch for the eland at first light, when the herds came down to drink and the mist lay along the ground. They were told not to shout, not to point, and not to run at it. “Let it see you seeing it,” the old people said. “Then you will know whether you have understood anything at all.”',
      'Some of the old people say that the eland was the first of all creatures, and that when you see one standing in the low light, you are seeing something that was once made out of earth and honey and the last of the day. They say you should look at it for a long time.',
      'That is why the old people do not speak loudly of the eland. A creature made with wonder deserves to be met with wonder, and the one who sees it well has more than the one who takes it.',
    ],
  },
  {
    slug: 'the-first-drum',
    title: 'The First Drum',
    summary:
      'A young carver hears a hollow tree humming in the forest and makes the first drum, a voice that can call a whole people home.',
    moral: 'A hollow thing can still carry a great voice.',
    tribeSlug: 'kuba',
    categorySlug: 'folklore',
    narratorSlug: 'kofi-mensah',
    publishedAt: '2026-10-02T07:15:00.000Z',
    popularityScore: 0.47,
    coverAlt: 'A tall drum with geometric Kuba cloth patterns beside a forest of upright trees',
    attributionName: 'Kuba',
    paragraphs: [
      'In the forest kingdom of the Kuba, the people say there was a time when a message took a whole day to travel from the river to the court. The king could give an order at sunrise and wait for its answer until the light had gone from the sky.',
      'A young carver named Mbangwa was looking for good wood when he heard a sound in the forest: a low note, almost like a voice, humming in a hollow tree. He put his ear against the trunk. The tree was full of bees, and the wind was passing over the opening, and the tree was singing.',
      'Mbangwa did not cut the tree down that day. He went home and thought about the sound for two months. Then he came back with a fierce little fire, and he burned the heart of the wood out slowly, and he stretched an antelope hide across the top of the hollow trunk while the wood was still warm.',
      'When he struck it, the whole forest answered. The birds went up. The bees came out. Monkeys ran through the branches for half a day. Mbangwa struck it again, and heard a note that could be heard across the river.',
      'He carried the drum to the court and laid it before the king. The king was cautious. “A drum that can be heard across the river can also be heard by enemies,” he said. “What will you do about that?” Mbangwa had already thought of it. He showed the king two patterns of striking: one that announced guests, and one that announced danger.',
      'The Kuba learned to speak with the drum, and the drum began to carry names, news, and the memory of who had come before. The old people say that a drum is never only a drum. It is a tree that learned to speak, and a people that learned to listen.',
    ],
  },
  {
    slug: 'the-river-that-remembers',
    title: 'The River That Remembers',
    summary:
      'An old woman teaches a ferryman that the Zambezi keeps the names of everyone who has ever asked it for passage.',
    moral: 'The river remembers what we ask of it, and what we give back.',
    tribeSlug: 'tonga',
    categorySlug: 'folklore',
    narratorSlug: 'thandiwe-nkosi',
    publishedAt: '2026-09-27T06:00:00.000Z',
    popularityScore: 0.49,
    coverAlt: 'A baobab beside broad river bands, a small canoe and a low sun',
    attributionName: 'Tonga',
    paragraphs: [
      'The Zambezi does not widen easily; it gathers its water and then takes it away in a hurry. The Tonga tell of a ferryman who knew every current from the rapids to the shallows, and who had carried people across for so long that he no longer remembered a life before the canoe.',
      'One evening an old woman came to the bank with a clay pot on her head and asked to cross. There was a storm coming, and the ferryman told her to wait until morning. “The river is angry,” he said. The old woman shook her head. “The river is not angry,” she said. “It is remembering. Let us go.”',
      'They crossed with the water pushing at the canoe from every side. The ferryman paddled as he had never paddled before, and the old woman spoke quietly to the river, and every name she spoke seemed to calm a stretch of the water just ahead of them.',
      'On the far bank the ferryman asked her whose names she had been saying. “The names of the people who crossed here before you,” said the old woman. “Your river keeps them. It keeps the ones who asked for passage and the ones who gave nothing, and it does not tell them apart unless you do.”',
      'The ferryman thought about this. After that he kept a gourd on the bank, and everyone who crossed left a little grain, a little milk, or a little salt in it. When the gourd was full, he carried it to the old woman’s village, and the village fed the ferryman and his family in return.',
      'The river still remembers. At the place where the ferryman kept his gourd the water is said to be gentler than anywhere else on that bend. The old people say this is not because the river is kind, but because it has been greeted properly.',
    ],
  },
  {
    slug: 'why-the-tortoise-carries-his-house',
    title: 'Why the Tortoise Carries His House',
    summary:
      'When the animals are invited to a feast, the tortoise cannot bear to leave his fine new house behind — so he makes a bargain he cannot undo.',
    moral: 'The home you cannot set down is the home that sets down your feet.',
    tribeSlug: 'igbo',
    categorySlug: 'animal',
    narratorSlug: 'adewale-okunola',
    publishedAt: '2026-09-22T06:45:00.000Z',
    popularityScore: 0.67,
    coverAlt: 'A tortoise whose patterned shell forms a small round house among tall forest trees',
    attributionName: 'Igbo',
    paragraphs: [
      'In those days the tortoise Mbe had a beautiful house with a smooth clay floor and a door that faced the morning. He had built it himself, slowly, and he was very proud of it. He was also invited, that season, to a great feast in the market of the next village.',
      'Mbe wanted the animals to see him, but he did not want to leave his house where someone might sleep on the floor or lean against the door. He worried about it all the way to the market. He worried so much that he could not enjoy the food, which was unusual for Mbe.',
      'A stranger beside him at the feast watched him looking back at the road. “You have a fine house,” the stranger said. “And the road is long. Why not bring it with you?” It was a joke. Mbe did not hear it as one.',
      'He called his friends together and told them his plan. He would fold the house around himself like a cape and travel with it. The animals laughed, and Mbe took their laughter as encouragement, which was his first mistake. The second was asking the strongest of them to help him fold the walls.',
      'They folded the house, and it became a shell; and when Mbe stood inside it, it closed over him and left a place only for his head and his four feet. He could walk. He could eat what he found. He could not climb a hill quickly, or turn round easily, or set the house down unless he first found a soft place and a friend to help him.',
      'The animals laughed again, but they stopped laughing when they saw that Mbe had gone on walking, year after year, with his house on his back. That is why the tortoise is slow. He is not lazy. He is simply carrying more than the others, and he has never found a good place to put it down.',
    ],
  },
  {
    slug: 'hlakanyana-and-the-lions-feast',
    title: 'Hlakanyana and the Lion’s Feast',
    summary:
      'The small trickster Hlakanyana talks his way into a lion’s feast by promising a gift he has not yet invented.',
    moral: 'Cleverness opens the door; it is patience that keeps the fire.',
    tribeSlug: 'xhosa',
    categorySlug: 'trickster',
    narratorSlug: 'thandiwe-nkosi',
    publishedAt: '2026-09-17T06:00:00.000Z',
    popularityScore: 0.55,
    coverAlt:
      'A small quick figure with a feather standing before a lion’s great silhouette and a low moon',
    attributionName: 'Xhosa',
    paragraphs: [
      'Hlakanyana was so small that the grass looked like a forest to him, and so quick that people said he must have four legs and two tongues. He heard that the lion of the district was giving a feast and had said no small creature could come, because a small creature makes a small gift.',
      'Hlakanyana thought about this for a while. Then he tied a feather to his head, took a stick, and went to the lion’s gate. “I have a gift for you,” he announced. “I have brought you a goat so heavy that I could not carry it. It is waiting at the top of the hill.”',
      'The lion was greedy and proud, and the thought of a goat at the top of the hill pleased him. “Then we will go and fetch it after the food,” he said. He invited Hlakanyana to sit beside him, which was exactly what Hlakanyana had wanted.',
      'The feast was served. Hlakanyana ate everything he was given and everything that was given to the animals next to him, because he was small and could pass from place to place without being noticed. By the time the sun went down, he was round as a calabash.',
      'Then the lion stood up and said, “Now, Hlakanyana, where is my goat?” Hlakanyana jumped onto the table and bowed. “The goat,” he said, “is at the top of the hill. But I see that you have already eaten it — you must have sent someone ahead. Good. Then you owe me nothing, and I owe you nothing, and we are both full.”',
      'He was over the fence and into the grass before the lion had finished roaring. The lion never caught him, because no one catches a story that is already running. The animals tell it still, and they say that Hlakanyana’s belly was round that night, but his legs were faster than his belly.',
    ],
  },
  {
    slug: 'the-hare-and-the-hyenas-bag',
    title: 'The Hare and the Hyena’s Bag',
    summary:
      'The hare tricks a greedy hyena into carrying him home in a bag, and the road teaches the hyena a lesson about measuring a favour.',
    moral: 'The one who asks for the whole road ends up carrying the traveller.',
    tribeSlug: 'mandinka',
    categorySlug: 'trickster',
    narratorSlug: 'amina-diallo',
    publishedAt: '2026-09-12T07:00:00.000Z',
    popularityScore: 0.43,
    coverAlt: 'A hare peering from a woven bag slung across a hyena’s back beneath a baobab',
    attributionName: 'Mandinka',
    paragraphs: [
      'A hyena found a bag of grain beside the road and was deciding how to carry it home when the hare came along, walking as if he had all day. “That is a heavy bag,” the hare said. “Shall I help you carry it? I am small, but I am clever about weight.”',
      'The hyena did not like the word clever. “I will carry it myself,” she said. “And I will carry you too, if you keep talking, because you look lighter than the bag.”',
      'The hare climbed in. The hyena tied the bag shut and put it on her back, pleased with herself, and started up the road. After a while the hare, inside the bag, began to complain that the grain was pressing into him. “Put me on top,” he said. “I will keep watch for thieves.”',
      'The hyena opened the bag and put the hare on top of the grain. The hare kept watch, and after a while he said, “There is a thief behind us. Let me off, and I will chase him.” The hyena let him off, and the hare ran off, and that was the last she saw of him for a while.',
      'At the top of the road the hyena met the hare again, walking as if he had all day. “You left me with the bag,” she growled. “Yes,” said the hare. “But I also kept the thieves away, and I carried the weight of the bag from the moment I sat on it. You measured the favour wrong.”',
      'The hyena went home with the grain and no answer, which is the worst way to end an argument. The old people say she has been wary of small animals carrying bags ever since, and the hare still walks as if he has all day — which, somehow, he does.',
    ],
  },
  {
    slug: 'ngai-and-the-sacred-fig',
    title: 'Ngai and the Sacred Fig',
    summary:
      'Ngai shows the first man and woman a fig tree on the mountain, and gives them the land on one condition: that the tree be left standing.',
    moral: 'The land is borrowed from those who come after us.',
    tribeSlug: 'kikuyu',
    categorySlug: 'creation',
    narratorSlug: 'naserian-leltika',
    publishedAt: '2026-09-08T06:00:00.000Z',
    popularityScore: 0.74,
    coverAlt: 'A great fig tree in front of a snow-capped mountain with rays of morning light',
    attributionName: 'Kikuyu',
    paragraphs: [
      'The Kikuyu say that Ngai, who is above, looked down one morning and saw that Mount Kirinyaga was the finest place on earth. He made his home on the mountain, and from its slopes he looked out over the highlands.',
      'To the first man, Gikuyu, Ngai gave a wife, Mumbi, and showed them a wide and beautiful country: the forests, the rivers, the rich black soil, the places where the mist gathers. “This is yours to care for,” he said. “Go and make your home.”',
      'Gikuyu and Mumbi went down the mountain and found the land full of game and wild fruit. In the middle of it stood a great fig tree, taller than any other, with a spread of shade so wide that a whole herd could rest beneath it.',
      '“Why is this one tree left standing?” Gikuyu asked. Ngai’s answer came through the birds and the wind: “That tree is mine. It is where I may be greeted. Do not cut it, and do not burn it, and your children’s children will always have a place to speak with me.”',
      'So the fig tree was left. The people cleared the brush around it, and built their homesteads nearby, and the tree became the place where elders gathered to settle matters and where travellers stopped to greet the mountain before going on their way.',
      'The old people say that a land is not owned; it is held in trust. The fig tree is the sign of that trust, and so is the mountain under which every Kikuyu family’s story begins. The land is borrowed from those who come after us, and the tree is the receipt.',
    ],
  },
  {
    slug: 'the-judge-and-the-grain-of-salt',
    title: 'The Judge and the Grain of Salt',
    summary:
      'Two traders claim the same sack of salt, and a highland judge settles the matter with nothing but a cup of clean water.',
    moral: 'Truth dissolves slowly, but it always leaves a taste.',
    tribeSlug: 'amhara',
    categorySlug: 'wisdom',
    narratorSlug: 'tsegaye-alemu',
    publishedAt: '2026-09-03T06:30:00.000Z',
    popularityScore: 0.4,
    coverAlt:
      'Salt blocks and a shallow cup on a highland terrace beneath a wide sun and layered ridges',
    attributionName: 'Amhara',
    paragraphs: [
      'Two traders came before the judge of the district, each leading a donkey, each claiming the same sack of salt. “I bought it at the market,” said the first. “He stole it from my load while I slept,” said the second. “I bought it,” said the first again, louder.',
      'The judge was old and had heard a great many loud men. He asked each of them the same questions: where they had bought the salt, what they had paid, which road they had taken. Their answers were almost alike. The first, however, was a man who could not stop describing his own cleverness, and the second was a man who said very little.',
      'The judge ordered the sack untied and a handful of salt taken from the top. He called for a cup of clean water and dropped the salt into it. Then he asked each trader to bring his own small stock of salt, the salt he sold every day.',
      'The first trader brought a fine white salt, coarse as the judge’s thumb. The second brought a greyer salt, ground finer, with a smell of the road about it. The judge dissolved a pinch of each in two more cups, and set all three cups on the table in the sun.',
      '“Now,” he said, “speak the truth. One of these cups will taste like the load. The one whose salt matches the sack is the one who has been carrying it.” The first trader looked at the cups and grew quiet. The second drank his cup slowly, and the judge saw him smile.',
      'The salt had settled the matter. The first trader paid a fine and went home ashamed, and the second went on his way with his load. The old people say the judge never raised his voice. He only gave the truth a little water, and it spoke for itself.',
    ],
  },
  {
    slug: 'waaqa-and-the-first-rain',
    title: 'Waaqa and the First Rain',
    summary:
      'When the sky was still close to the earth, a woman’s pestle struck it, and Waaqa withdrew — but left the rain as a gift.',
    moral: 'Do not strike at the sky; ask it for water instead.',
    tribeSlug: 'oromo',
    categorySlug: 'creation',
    narratorSlug: 'naserian-leltika',
    publishedAt: '2026-09-30T06:00:00.000Z',
    popularityScore: 0.45,
    coverAlt:
      'Blue-grey rain falling in long lines from flat clouds onto a green sprout and distant peaks',
    attributionName: 'Oromo',
    paragraphs: [
      'The Oromo say that in the beginning Waaqa placed the sky very near the earth, so near that a tall person could touch it with a stick. The sky was warm and generous, and it kept the earth from growing cold at night.',
      'The people lived well beneath it. They had cattle and grain and enough water. The trouble began when a woman was pounding grain in her mortar with a long wooden pestle, and the sky was hanging low above her head.',
      'She lifted the pestle high and struck the sky by accident. There was a sound like thunder, and the sky shuddered and began to rise. The woman dropped her pestle and held up her hands. “I did not mean it,” she cried.',
      'Waaqa rose a little, and the earth grew cooler. Waaqa rose a little more, and the people could no longer reach up and touch it. The woman wept, because she had undone a kindness with one careless blow.',
      'But Waaqa did not leave the earth without help. “Since I can no longer be near you,” Waaqa said, “I will send my water down. Ask for it with your fields and your herds, and with a clean heart. I will hear you from higher up.”',
      'And that is why the rain comes from a sky that no hand can reach, and why the old people say you should not strike at the sky in anger or in carelessness. Ask, and be ready to be answered. The woman’s pestle is still in the story, and the rain is still the answer.',
    ],
  },
  {
    slug: 'the-salt-caravan',
    title: 'The Salt Caravan',
    summary:
      'On the long road to the salt pans, a young driver learns that a grudge weighs more than any load of salt.',
    moral: 'Share the water; the desert will take the grudge anyway.',
    tribeSlug: 'hausa',
    categorySlug: 'wisdom',
    narratorSlug: 'amina-diallo',
    publishedAt: '2026-10-11T06:00:00.000Z',
    popularityScore: 0.61,
    coverAlt:
      'Camels carrying salt blocks across rolling dunes towards a low sun, with patterned cloth bands above',
    attributionName: 'Hausa',
    paragraphs: [
      'The salt caravan left the town before first light, when the air was still cool and the camels complained softly under their loads. It would travel for many days to the pans, and many days back, and the success of the journey was measured by two things: the salt that arrived, and the people who did.',
      'A young driver named Suleiman had been given charge of two camels and a share of the water. He was proud of this. He walked beside his camels with the rope over his shoulder and looked at the older drivers to see how they did it.',
      'At the noon halt on the third day, he noticed that his family’s old rival, Danladi, was waterless. Danladi’s skin bag had split. He was sitting in the shade of his camel, not asking anyone for help, and the other drivers were looking elsewhere.',
      'Suleiman’s father had told him never to help Danladi, because of a debt from before Suleiman was born. Suleiman looked at his own full bag, and then at the old man’s dry mouth, and then at the long road ahead, which did not care about debts.',
      'He carried the water over and let Danladi drink. Danladi stared at him a long time and then said, “Your father will hear of this.” Suleiman said, “My father has not walked this road in ten years. I have.” The caravan moved on that afternoon with a lighter silence.',
      'At the pans, when the salt was loaded, the caravan leader took Suleiman aside. “You wondered why I put you beside Danladi,” he said. “The desert does not care whose grandfather quarrelled with whose. Water shared is water saved. The heaviest load on the road to the salt pans is a grudge, and you put yours down.”',
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

const REGIONS = {
  zulu: 'SOUTHERN AFRICA',
  shona: 'SOUTHERN AFRICA',
  yoruba: 'WEST AFRICA',
  ashanti: 'WEST AFRICA',
  maasai: 'EAST AFRICA',
  dogon: 'WEST AFRICA',
  'san-khoikhoi': 'SOUTHERN AFRICA',
  kuba: 'CENTRAL AFRICA',
  tonga: 'SOUTHERN AFRICA',
  igbo: 'WEST AFRICA',
  xhosa: 'SOUTHERN AFRICA',
  mandinka: 'WEST AFRICA',
  kikuyu: 'EAST AFRICA',
  amhara: 'EAST AFRICA',
  oromo: 'EAST AFRICA',
  hausa: 'WEST AFRICA',
};

mkdirSync(OUT_DIR, { recursive: true });
const problems = [];
const report = [];

for (const story of stories) {
  const body = buildStoryBody(story.paragraphs);
  const words = countWords(body);
  const accent = ACCENT[story.tribeSlug];
  const paragraphCount = body.paragraphs.length;
  const featured = Boolean(story.isFeatured);

  const expected = featured
    ? { minParas: 10, maxParas: 14, minWords: 600, maxWords: 1000 }
    : { minParas: 4, maxParas: 7, minWords: 250, maxWords: 500 };

  if (!accent) problems.push(`${story.slug}: unknown tribe ${story.tribeSlug}`);
  if (paragraphCount < expected.minParas || paragraphCount > expected.maxParas) {
    problems.push(
      `${story.slug}: ${paragraphCount} paragraphs, expected ${expected.minParas}-${expected.maxParas}`,
    );
  }
  if (words < expected.minWords || words > expected.maxWords) {
    problems.push(
      `${story.slug}: ${words} words, expected ${expected.minWords}-${expected.maxWords}`,
    );
  }
  if (story.summary.length < 90 || story.summary.length > 180) {
    problems.push(`${story.slug}: summary is ${story.summary.length} chars, expected 90-180`);
  }
  if (story.moral.length > 300) problems.push(`${story.slug}: moral too long`);
  if (story.title.length > 160) problems.push(`${story.slug}: title too long`);

  // Sentence hygiene: sequential global ids, punctuation, no stray whitespace.
  let n = 0;
  for (const paragraph of body.paragraphs) {
    if (!/^p_\d{2}$/.test(paragraph.id))
      problems.push(`${story.slug}: bad paragraph id ${paragraph.id}`);
    for (const sentence of paragraph.sentences) {
      n += 1;
      const expectedId = `s_${String(n).padStart(4, '0')}`;
      if (sentence.id !== expectedId) {
        problems.push(`${story.slug}: sentence id ${sentence.id}, expected ${expectedId}`);
      }
      if (sentence.text !== sentence.text.trim()) {
        problems.push(`${story.slug}/${sentence.id}: leading/trailing whitespace`);
      }
      if (!/[.!?…]["”’']?$/.test(sentence.text)) {
        problems.push(
          `${story.slug}/${sentence.id}: no closing punctuation: ${sentence.text.slice(0, 40)}`,
        );
      }
      if (/\s{2,}/.test(sentence.text)) {
        problems.push(`${story.slug}/${sentence.id}: double space`);
      }
    }
  }

  const out = {
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    moral: story.moral,
    tribeSlug: story.tribeSlug,
    categorySlug: story.categorySlug,
    narratorSlug: story.narratorSlug,
    regionLabel: REGIONS[story.tribeSlug],
    attribution: `A traditional ${story.attributionName} tale, retold for Ubuntu Tales.`,
    cover: {
      url: `/covers/${story.slug}.svg`,
      alt: story.coverAlt,
      accent,
      width: 1200,
      height: 800,
    },
    publishedAt: story.publishedAt,
    isFeatured: featured,
    popularityScore: story.popularityScore,
    body,
  };

  writeFileSync(join(OUT_DIR, `${story.slug}.json`), `${JSON.stringify(out, null, 2)}\n`);
  report.push({ slug: story.slug, words, paragraphs: paragraphCount, sentences: n, featured });
}

console.table(report);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}
console.log(`\nWrote ${stories.length} story files to content/stories/`);
