import { COUNTRIES } from "./countries";

/** Local hours at which each country's prices refresh. */
export const PRICE_UPDATE_HOURS = [11, 23] as const;
/** A slot missed by a failed or late scheduler call can still run for this long. */
export const PRICE_SLOT_GRACE_MINUTES = 60;

/** One zone per country: the capital's zone where a country spans several. */
export const COUNTRY_TIME_ZONES: Record<string, string> = {
  AF: "Asia/Kabul",
  AL: "Europe/Tirane",
  DZ: "Africa/Algiers",
  AZ: "Asia/Baku",
  BH: "Asia/Bahrain",
  BD: "Asia/Dhaka",
  BN: "Asia/Brunei",
  BF: "Africa/Ouagadougou",
  TD: "Africa/Ndjamena",
  KM: "Indian/Comoro",
  DJ: "Africa/Djibouti",
  EG: "Africa/Cairo",
  GM: "Africa/Banjul",
  GN: "Africa/Conakry",
  ID: "Asia/Jakarta",
  IR: "Asia/Tehran",
  IQ: "Asia/Baghdad",
  JO: "Asia/Amman",
  KZ: "Asia/Almaty",
  KW: "Asia/Kuwait",
  KG: "Asia/Bishkek",
  LB: "Asia/Beirut",
  LY: "Africa/Tripoli",
  MY: "Asia/Kuala_Lumpur",
  MV: "Indian/Maldives",
  ML: "Africa/Bamako",
  MR: "Africa/Nouakchott",
  MA: "Africa/Casablanca",
  NE: "Africa/Niamey",
  NG: "Africa/Lagos",
  OM: "Asia/Muscat",
  PK: "Asia/Karachi",
  PS: "Asia/Hebron",
  QA: "Asia/Qatar",
  SA: "Asia/Riyadh",
  SN: "Africa/Dakar",
  SL: "Africa/Freetown",
  SO: "Africa/Mogadishu",
  SD: "Africa/Khartoum",
  SY: "Asia/Damascus",
  TJ: "Asia/Dushanbe",
  TN: "Africa/Tunis",
  TR: "Europe/Istanbul",
  TM: "Asia/Ashgabat",
  AE: "Asia/Dubai",
  UZ: "Asia/Tashkent",
  YE: "Asia/Aden",
  AD: "Europe/Andorra",
  AO: "Africa/Luanda",
  AG: "America/Antigua",
  AR: "America/Argentina/Buenos_Aires",
  AM: "Asia/Yerevan",
  AU: "Australia/Sydney",
  AT: "Europe/Vienna",
  BS: "America/Nassau",
  BB: "America/Barbados",
  BY: "Europe/Minsk",
  BE: "Europe/Brussels",
  BZ: "America/Belize",
  BJ: "Africa/Porto-Novo",
  BT: "Asia/Thimphu",
  BO: "America/La_Paz",
  BA: "Europe/Sarajevo",
  BW: "Africa/Gaborone",
  BR: "America/Sao_Paulo",
  BG: "Europe/Sofia",
  BI: "Africa/Bujumbura",
  KH: "Asia/Phnom_Penh",
  CM: "Africa/Douala",
  CA: "America/Toronto",
  CV: "Atlantic/Cape_Verde",
  CF: "Africa/Bangui",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  CO: "America/Bogota",
  CR: "America/Costa_Rica",
  HR: "Europe/Zagreb",
  CU: "America/Havana",
  CY: "Asia/Nicosia",
  CZ: "Europe/Prague",
  DK: "Europe/Copenhagen",
  DM: "America/Dominica",
  DO: "America/Santo_Domingo",
  CD: "Africa/Kinshasa",
  EC: "America/Guayaquil",
  SV: "America/El_Salvador",
  GQ: "Africa/Malabo",
  ER: "Africa/Asmara",
  EE: "Europe/Tallinn",
  SZ: "Africa/Mbabane",
  ET: "Africa/Addis_Ababa",
  FJ: "Pacific/Fiji",
  FI: "Europe/Helsinki",
  FR: "Europe/Paris",
  GA: "Africa/Libreville",
  GE: "Asia/Tbilisi",
  DE: "Europe/Berlin",
  GH: "Africa/Accra",
  GR: "Europe/Athens",
  GD: "America/Grenada",
  GT: "America/Guatemala",
  GW: "Africa/Bissau",
  GY: "America/Guyana",
  HT: "America/Port-au-Prince",
  HN: "America/Tegucigalpa",
  HU: "Europe/Budapest",
  IS: "Atlantic/Reykjavik",
  IN: "Asia/Kolkata",
  IE: "Europe/Dublin",
  IL: "Asia/Jerusalem",
  IT: "Europe/Rome",
  CI: "Africa/Abidjan",
  JM: "America/Jamaica",
  JP: "Asia/Tokyo",
  KE: "Africa/Nairobi",
  KI: "Pacific/Tarawa",
  LA: "Asia/Vientiane",
  LV: "Europe/Riga",
  LS: "Africa/Maseru",
  LR: "Africa/Monrovia",
  LI: "Europe/Vaduz",
  LT: "Europe/Vilnius",
  LU: "Europe/Luxembourg",
  MG: "Indian/Antananarivo",
  MW: "Africa/Blantyre",
  MT: "Europe/Malta",
  MH: "Pacific/Majuro",
  MU: "Indian/Mauritius",
  MX: "America/Mexico_City",
  FM: "Pacific/Pohnpei",
  MD: "Europe/Chisinau",
  MC: "Europe/Monaco",
  MN: "Asia/Ulaanbaatar",
  ME: "Europe/Podgorica",
  MZ: "Africa/Maputo",
  MM: "Asia/Yangon",
  NA: "Africa/Windhoek",
  NR: "Pacific/Nauru",
  NP: "Asia/Kathmandu",
  NL: "Europe/Amsterdam",
  NZ: "Pacific/Auckland",
  NI: "America/Managua",
  KP: "Asia/Pyongyang",
  MK: "Europe/Skopje",
  NO: "Europe/Oslo",
  PW: "Pacific/Palau",
  PA: "America/Panama",
  PG: "Pacific/Port_Moresby",
  PY: "America/Asuncion",
  PE: "America/Lima",
  PH: "Asia/Manila",
  PL: "Europe/Warsaw",
  PT: "Europe/Lisbon",
  CG: "Africa/Brazzaville",
  RO: "Europe/Bucharest",
  RU: "Europe/Moscow",
  RW: "Africa/Kigali",
  KN: "America/St_Kitts",
  LC: "America/St_Lucia",
  VC: "America/St_Vincent",
  WS: "Pacific/Apia",
  SM: "Europe/San_Marino",
  ST: "Africa/Sao_Tome",
  RS: "Europe/Belgrade",
  SC: "Indian/Mahe",
  SG: "Asia/Singapore",
  SK: "Europe/Bratislava",
  SI: "Europe/Ljubljana",
  SB: "Pacific/Guadalcanal",
  ZA: "Africa/Johannesburg",
  KR: "Asia/Seoul",
  SS: "Africa/Juba",
  ES: "Europe/Madrid",
  LK: "Asia/Colombo",
  SR: "America/Paramaribo",
  SE: "Europe/Stockholm",
  CH: "Europe/Zurich",
  TZ: "Africa/Dar_es_Salaam",
  TH: "Asia/Bangkok",
  TL: "Asia/Dili",
  TG: "Africa/Lome",
  TO: "Pacific/Tongatapu",
  TT: "America/Port_of_Spain",
  TV: "Pacific/Funafuti",
  UG: "Africa/Kampala",
  UA: "Europe/Kyiv",
  GB: "Europe/London",
  US: "America/New_York",
  UY: "America/Montevideo",
  VU: "Pacific/Efate",
  VA: "Europe/Vatican",
  VE: "America/Caracas",
  VN: "Asia/Ho_Chi_Minh",
  ZM: "Africa/Lusaka",
  ZW: "Africa/Harare",
};

export type CountryPriceSlot = {
  country: string;
  timeZone: string;
  localDate: string;
  localHour: number;
  slotAt: string;
};
export type CompletedPriceSlot = { country: string; local_date: string; local_hour: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function localClock(at: Date, timeZone: string) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  const parts = Object.fromEntries(format.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    minutes: Number(parts["hour"]) * 60 + Number(parts["minute"]),
  };
}

/** Countries whose latest 11:00 or 23:00 local slot started within the grace window. */
export function dueCountrySlots(now: Date): CountryPriceSlot[] {
  const minuteStart = Math.floor(now.getTime() / 60_000) * 60_000;
  const seen = new Set<string>();
  const slots: CountryPriceSlot[] = [];
  for (const { code } of COUNTRIES) {
    if (seen.has(code)) continue;
    seen.add(code);
    const timeZone = COUNTRY_TIME_ZONES[code];
    if (!timeZone) throw new Error(`Missing time zone for ${code}`);
    const { minutes } = localClock(now, timeZone);
    for (const localHour of PRICE_UPDATE_HOURS) {
      const elapsed = (minutes - localHour * 60 + 1440) % 1440;
      if (elapsed >= PRICE_SLOT_GRACE_MINUTES) continue;
      const slot = new Date(minuteStart - elapsed * 60_000);
      slots.push({
        country: code,
        timeZone,
        localDate: localClock(slot, timeZone).date,
        localHour,
        slotAt: slot.toISOString(),
      });
    }
  }
  return slots;
}

/** Keyed by local date and hour, so a repeated clock hour at a DST change runs once. */
export function pendingCountrySlots(
  slots: CountryPriceSlot[],
  completed: CompletedPriceSlot[],
): CountryPriceSlot[] {
  const key = (country: string, date: string, hour: number) => `${country}|${date}|${hour}`;
  const done = new Set(completed.map((c) => key(c.country, c.local_date, c.local_hour)));
  return slots.filter((s) => !done.has(key(s.country, s.localDate, s.localHour)));
}
