import type { Aisle, MealDay, WallData, WallEvent, WallPerson } from "@/lib/wall/types";

// Sample family for the prototype. The repo is public, so these are made-up
// names, the same ones the calendar demo data uses.
export const SAMPLE_PEOPLE: WallPerson[] = [
  { id: "alex", name: "Alex", color: "#3949D6", ink: "#FFFFFF" },
  { id: "jordan", name: "Jordan", color: "#D23F77", ink: "#FFFFFF" },
  { id: "sam", name: "Sam", color: "#F2A007", ink: "#1A1300" },
  { id: "riley", name: "Riley", color: "#0F9B76", ink: "#FFFFFF" },
];

export const FAMILY: WallPerson = {
  id: "family",
  name: "Family",
  color: "#111111",
  ink: "#FFFFFF",
};

export const BOT_NAME = "Groobot";

/** Fixed travel buffer before events with a place, per the plan. */
export const TRAVEL_BUFFER_MIN = 15;

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function at(day: Date, hours: number, minutes = 0): number {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next.getTime();
}

type EventSeed = [
  personId: string,
  title: string,
  location: string,
  h: number,
  m: number,
  mins: number,
];

const TODAY_EVENTS: EventSeed[] = [
  ["sam", "School bus", "", 7, 25, 10],
  ["alex", "Train to city", "Scarsdale station", 8, 2, 40],
  ["jordan", "Yoga", "Studio on Spencer Pl", 9, 30, 60],
  ["alex", "Design review", "", 11, 0, 60],
  ["riley", "Library visit", "Scarsdale Library", 13, 0, 60],
  ["sam", "Soccer practice", "Crossway Field", 15, 30, 90],
  ["riley", "Piano lesson", "Ms. Park's studio", 16, 15, 45],
  ["jordan", "Dentist", "Garth Rd Dental", 17, 0, 45],
  ["family", "Pizza and game night", "", 18, 30, 120],
  ["alex", "Call with Grandma", "", 20, 30, 30],
];

const TOMORROW_EVENTS: EventSeed[] = [
  ["sam", "Picture day", "", 8, 0, 30],
  ["jordan", "Book club", "Tanya's house", 19, 30, 90],
  ["riley", "Swim lesson", "Y pool", 16, 0, 45],
];

export function sampleEvents(now = new Date()): WallEvent[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const build = (day: Date, seeds: EventSeed[], prefix: string) =>
    seeds.map(([personId, title, location, h, m, mins], index) => {
      const start = at(day, h, m);
      return {
        id: `${prefix}-${index}`,
        title,
        location,
        start,
        end: start + mins * 60_000,
        allDay: false,
        personId,
      };
    });
  return [
    {
      id: "bins",
      title: "Recycling out tonight",
      location: "",
      start: at(today, 0),
      end: at(addDays(today, 1), 0),
      allDay: true,
      personId: "family",
    },
    ...build(today, TODAY_EVENTS, "t"),
    ...build(addDays(today, 1), TOMORROW_EVENTS, "n"),
  ];
}

export const SAMPLE_WEATHER = {
  temp: 58,
  label: "Partly cloudy",
  icon: "CloudSun",
  hi: 63,
  lo: 47,
  summary: "Rain from 4 PM.",
  advice: "Pack a rain jacket for soccer.",
  hourly: [
    { label: "Now", temp: 58, icon: "CloudSun", wet: false },
    { label: "1p", temp: 61, icon: "CloudSun", wet: false },
    { label: "2p", temp: 62, icon: "Cloud", wet: false },
    { label: "3p", temp: 63, icon: "Cloud", wet: false },
    { label: "4p", temp: 60, icon: "CloudRain", wet: true },
    { label: "5p", temp: 57, icon: "CloudRain", wet: true },
    { label: "6p", temp: 54, icon: "CloudDrizzle", wet: true },
    { label: "7p", temp: 52, icon: "Cloud", wet: false },
  ],
};

// Photos are a stand-in for the Drive folder. picsum.photos serves stable
// images by id; the wall shows a coloured card if they can't load.
export const SAMPLE_PHOTOS = [
  { id: 1015, caption: "Lake trip", when: "Aug 2025", tint: "#4b6b7a" },
  { id: 1018, caption: "Adirondacks", when: "Jul 2024", tint: "#5c6b4a" },
  { id: 1043, caption: "Back porch", when: "Oct 2025", tint: "#7a5a3c" },
  { id: 1039, caption: "Waterfall hike", when: "Jun 2025", tint: "#3c5a55" },
  { id: 1044, caption: "Beach weekend", when: "1 year ago today", tint: "#6a7a8c" },
  { id: 1047, caption: "City day", when: "Mar 2025", tint: "#5a5a66" },
  { id: 1056, caption: "Grandma's garden", when: "May 2025", tint: "#6b7a4a" },
];

export function photoUrl(id: number, width: number, height: number): string {
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

export const FAVOURITES: Array<{ name: string; aisle: Aisle }> = [
  { name: "Milk", aisle: "dairy" },
  { name: "Eggs", aisle: "dairy" },
  { name: "Bananas", aisle: "produce" },
  { name: "Bread", aisle: "bakery" },
  { name: "Apples", aisle: "produce" },
  { name: "Yogurt", aisle: "dairy" },
  { name: "Coffee", aisle: "pantry" },
  { name: "Paper towels", aisle: "household" },
];

const AISLE_WORDS: Array<[Aisle, RegExp]> = [
  [
    "produce",
    /apple|banana|lemon|lime|onion|garlic|carrot|potato|lettuce|spinach|tomato|pepper|berr|avocado|herb|parsley|cilantro|basil|celery|cucumber|fruit|grape/i,
  ],
  ["dairy", /milk|egg|yogurt|cheese|butter|cream/i],
  ["meat", /chicken|beef|pork|turkey|sausage|bacon|fish|salmon|shrimp/i],
  ["bakery", /bread|bagel|bun|roll|tortilla|pita/i],
  ["frozen", /frozen|ice cream|peas/i],
  ["household", /towel|soap|detergent|tissue|foil|wrap|bag|sponge|battery|trash/i],
  [
    "pantry",
    /rice|pasta|flour|sugar|oil|vinegar|sauce|cereal|coffee|tea|bean|can|stock|broth|spice|salt|honey|oat/i,
  ],
];

export function guessAisle(name: string): Aisle {
  for (const [aisle, pattern] of AISLE_WORDS) {
    if (pattern.test(name)) {
      return aisle;
    }
  }
  return "other";
}

export const AISLE_ORDER: Aisle[] = [
  "produce",
  "bakery",
  "dairy",
  "meat",
  "pantry",
  "frozen",
  "household",
  "other",
];

export const AISLE_LABEL: Record<Aisle, string> = {
  produce: "Produce",
  bakery: "Bakery",
  dairy: "Dairy & eggs",
  meat: "Meat & fish",
  pantry: "Pantry",
  frozen: "Frozen",
  household: "Household",
  other: "Other",
};

function sampleMeals(today: Date): MealDay[] {
  return [
    {
      date: dayKey(today),
      meals: [
        { slot: "breakfast", name: "Overnight oats with berries", setBy: BOT_NAME },
        {
          slot: "lunch",
          name: "Leftover chili, cornbread",
          forWho: "Alex and Jordan",
          setBy: BOT_NAME,
        },
        {
          slot: "dinner",
          name: "Sheet-pan chicken thighs with carrots and potatoes",
          serveAt: "6:15 PM",
          heat: { setting: "425°F", detail: "Convection roast, rack in the middle" },
          timeline: [
            { before: 50, label: "Preheat oven" },
            { before: 45, label: "Prep vegetables" },
            { before: 35, label: "Sheet pan in" },
            { before: 15, label: "Flip vegetables, check chicken (165°F)" },
            { before: 5, label: "Rest chicken, make sauce" },
          ],
          prep: [
            { item: "Yukon gold potatoes", cut: "1 in chunks" },
            { item: "Carrots", cut: "1/2 in coins, on the bias" },
            { item: "Red onion", cut: "Wedges, root on" },
            { item: "Garlic", cut: "6 cloves, smashed" },
            { item: "Parsley", cut: "Finely chopped" },
            { item: "Lemon", cut: "Zest, then halve" },
          ],
          steps: [
            "Toss potatoes, carrots and onion with 2 tbsp oil, salt and pepper.",
            "Pat chicken dry. Season with paprika, salt and lemon zest.",
            "Nestle chicken skin-side up between the vegetables.",
            "Roast 35 minutes. Flip the vegetables at 20 minutes.",
            "Rest 5 minutes. Squeeze lemon over and scatter parsley.",
          ],
          ingredients: [
            { name: "Chicken thighs", qty: "8, bone-in", have: true, aisle: "meat" },
            { name: "Yukon gold potatoes", qty: "1.5 lb", have: true, aisle: "produce" },
            { name: "Carrots", qty: "4", have: true, aisle: "produce" },
            { name: "Red onion", qty: "1", have: false, aisle: "produce" },
            { name: "Garlic", qty: "1 head", have: true, aisle: "produce" },
            { name: "Lemons", qty: "2", have: false, aisle: "produce" },
            { name: "Parsley", qty: "1 bunch", have: false, aisle: "produce" },
            { name: "Smoked paprika", qty: "1 tsp", have: true, aisle: "pantry" },
          ],
          setBy: BOT_NAME,
        },
      ],
    },
    {
      date: dayKey(addDays(today, 1)),
      defrost: "Move salmon to the fridge tonight",
      meals: [
        { slot: "breakfast", name: "Scrambled eggs and toast", setBy: BOT_NAME },
        { slot: "lunch", name: "Turkey wraps", setBy: BOT_NAME },
        {
          slot: "dinner",
          name: "Maple-soy salmon, rice, green beans",
          serveAt: "6:30 PM",
          heat: { setting: "400°F", detail: "Bake" },
          setBy: BOT_NAME,
        },
      ],
    },
    {
      date: dayKey(addDays(today, 2)),
      meals: [
        {
          slot: "dinner",
          name: "Taco night",
          serveAt: "6:00 PM",
          heat: { setting: "Medium-high", detail: "Stovetop skillet" },
          setBy: BOT_NAME,
        },
      ],
    },
    {
      date: dayKey(addDays(today, 3)),
      defrost: "Ground beef out Friday morning",
      meals: [
        {
          slot: "dinner",
          name: "Pizza and game night",
          serveAt: "6:30 PM",
          heat: { setting: "500°F", detail: "Pizza stone, 45 min preheat" },
          setBy: "Jordan",
        },
      ],
    },
    {
      date: dayKey(addDays(today, 4)),
      meals: [
        {
          slot: "dinner",
          name: "Spaghetti and meatballs",
          serveAt: "6:00 PM",
          heat: { setting: "Low simmer", detail: "Dutch oven" },
          setBy: BOT_NAME,
        },
      ],
    },
  ];
}

export function seedWallData(now = new Date()): WallData {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const t = now.getTime();
  const ago = (mins: number) => t - mins * 60_000;
  return {
    seededFor: dayKey(today),
    shopping: [
      {
        id: "s1",
        name: "Oat milk",
        qty: "2",
        aisle: "dairy",
        addedBy: BOT_NAME,
        addedAt: ago(20),
        done: false,
        doneAt: null,
      },
      {
        id: "s2",
        name: "Bananas",
        qty: "",
        aisle: "produce",
        addedBy: "Jordan",
        addedAt: ago(90),
        done: false,
        doneAt: null,
      },
      {
        id: "s3",
        name: "Greek yogurt",
        qty: "",
        aisle: "dairy",
        addedBy: "Jordan",
        addedAt: ago(200),
        done: false,
        doneAt: null,
      },
      {
        id: "s4",
        name: "Sourdough",
        qty: "1 loaf",
        aisle: "bakery",
        addedBy: "Alex",
        addedAt: ago(400),
        done: false,
        doneAt: null,
      },
      {
        id: "s5",
        name: "Dish soap",
        qty: "",
        aisle: "household",
        addedBy: "Jordan",
        addedAt: ago(600),
        done: false,
        doneAt: null,
      },
      {
        id: "s6",
        name: "Frozen peas",
        qty: "",
        aisle: "frozen",
        addedBy: BOT_NAME,
        addedAt: ago(700),
        done: false,
        doneAt: null,
      },
      {
        id: "s7",
        name: "Rice",
        qty: "2 lb",
        aisle: "pantry",
        addedBy: BOT_NAME,
        addedAt: ago(800),
        done: true,
        doneAt: ago(60),
      },
    ],
    todos: [
      {
        id: "d1",
        title: "Book Sam's dentist appointment",
        owner: "jordan",
        due: dayKey(today),
        notes: [
          { text: "Garth Rd Dental, (914) 555-0142", by: "Jordan", at: ago(60 * 26) },
          {
            text: "Called, they open at 8. Ask for a Tuesday after school.",
            by: BOT_NAME,
            at: ago(45),
          },
        ],
        done: false,
        updatedBy: BOT_NAME,
        updatedAt: ago(45),
      },
      {
        id: "d2",
        title: "Renew passports",
        owner: "alex",
        due: dayKey(addDays(today, 25)),
        notes: [
          {
            text: "Forms are in the blue folder. Need new photos for the kids.",
            by: "Alex",
            at: ago(60 * 50),
          },
        ],
        done: false,
        updatedBy: "Alex",
        updatedAt: ago(60 * 50),
      },
      {
        id: "d3",
        title: "Sign field trip form",
        owner: "either",
        due: dayKey(addDays(today, -1)),
        notes: [{ text: "In Riley's backpack, front pocket.", by: "Jordan", at: ago(60 * 20) }],
        done: false,
        updatedBy: "Jordan",
        updatedAt: ago(60 * 20),
      },
      {
        id: "d4",
        title: "Order Halloween costumes",
        owner: "jordan",
        due: dayKey(addDays(today, 3)),
        notes: [],
        done: false,
        updatedBy: "Jordan",
        updatedAt: ago(60 * 70),
      },
      {
        id: "d5",
        title: "Clean out the garage fridge",
        owner: "sam",
        due: null,
        notes: [],
        done: false,
        updatedBy: "Alex",
        updatedAt: ago(60 * 90),
      },
      {
        id: "d6",
        title: "Schedule furnace service",
        owner: "alex",
        due: dayKey(addDays(today, 7)),
        notes: [{ text: "Last service was Nov 2025.", by: BOT_NAME, at: ago(60 * 30) }],
        done: false,
        updatedBy: BOT_NAME,
        updatedAt: ago(60 * 30),
      },
      {
        id: "d7",
        title: "Return library books",
        owner: "riley",
        due: dayKey(today),
        notes: [],
        done: true,
        updatedBy: "Riley",
        updatedAt: ago(30),
      },
    ],
    meals: sampleMeals(today),
    notes: [
      {
        id: "n1",
        text: "Pizza night! Grandma arrives around 4 PM.",
        by: BOT_NAME,
        at: ago(35),
        until: at(today, 21),
      },
    ],
    activity: [
      { id: "a1", at: ago(20), by: BOT_NAME, text: "Added Oat milk ×2 to the list" },
      { id: "a2", at: ago(35), by: BOT_NAME, text: "Posted a note: Pizza night!" },
      {
        id: "a3",
        at: ago(45),
        by: BOT_NAME,
        text: "Added a note to Book Sam's dentist appointment",
      },
      { id: "a4", at: ago(90), by: "Jordan", text: "Added Bananas to the list" },
    ],
  };
}
