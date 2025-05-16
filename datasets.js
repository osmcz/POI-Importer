/**
 * Different datasets the tool can use
 *
 * The first-level keys are country names, in English,
 * as they will appear in the app
 *
 * The second level names are database identifiers.
 * These ids are used in the url, so should be as short as possible
 *
 * The name of a database will be visible in the app, and may be localised
 * The url can be a relative url, or an absolute one (starting with http:)
 * Relative URLs make testing on a local server easier.
 */
var datasets = {
  "Česká pošta" :
  {
    "Schránky" :
    {
    "url": "datasets/Czech-ceska-posta-schranky/",
    "name": "Schránky"
    }
  },
  "Zásilkovna" :
  {
    "Z-Boxy" :
    {
      "url": "datasets/Czech-Zasilkovna-Z-BOXy/",
      "name": "Zásilkovna: Z-BOXy"
    }
  },
  "Nadace Partnerství" :
  {
   "NAP_guest_house":
    {
      "url": "datasets/Czech-NAP/guest_house/",
      "name": "NAP Pensiony"
    },
    "NAP_hotel":
    {
      "url": "datasets/Czech-NAP/hotel/",
      "name": "NAP Hotely"
    },
    "NAP_hostel":
    {
      "url": "datasets/Czech-NAP/hostel/",
      "name": "NAP Hostely"
    },
    "NAP_chalet":
    {
      "url": "datasets/Czech-NAP/chalet/",
      "name": "NAP Chatky"
    },
    "NAP_apartment":
    {
      "url": "datasets/Czech-NAP/apartment/",
      "name": "NAP Apatmány"
    },
    "NAP_motel":
    {
      "url": "datasets/Czech-NAP/motel/",
      "name": "NAP Motely"
    },
    "NAP_camp_site":
    {
      "url": "datasets/Czech-NAP/camp_site/",
      "name": "NAP Kempy"
    },
    "NAP_information_office":
    {
      "url": "datasets/Czech-NAP/information_office/",
      "name": "NAP Informační centra"
    },
  },
  "Powerbox" :
  {
    "Powerbox" :
    {
      "url": "datasets/Czech-Powerbox/",
      "name": "Nabíjecí stanice"
    }
  },
};
