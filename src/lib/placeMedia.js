const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const CC_BY_30 = 'https://creativecommons.org/licenses/by/3.0';
const CC_BY_SA_20 = 'https://creativecommons.org/licenses/by-sa/2.0';
const CC_BY_SA_40 = 'https://creativecommons.org/licenses/by-sa/4.0';

function commonsFile(fileName) {
    return `${COMMONS}${fileName}`;
}

const thomsonBaySettlementImage = {
    src: '/place-images/thomson-bay-settlement-01.jpg',
    alt: 'Central grassed area in Thomson Bay Settlement on Rottnest Island',
    sourceUrl: commonsFile('Central_grassed_area_in_Thomson_Bay_Settlement,_Rottnest_Island,_April_2026_01.jpg'),
    author: 'Calistemon',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const hotelRottnestImage = {
    src: '/place-images/hotel-rottnest-01.jpg',
    alt: 'Hotel Rottnest building and outdoor area in Thomson Bay Settlement',
    sourceUrl: commonsFile('Hotel_Rottnest,_April_2026_01.jpg'),
    author: 'Calistemon',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const geordieBayImage = {
    src: '/beach-images/geordie-bay-01.jpg',
    alt: 'Geordie Bay water and shoreline near the local cafe and facilities',
    sourceUrl: commonsFile('Rottnest_Island_Geordie_Bay.jpg'),
    author: 'Cecilia Broderick',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const theBasinImage = {
    src: '/beach-images/the-basin-01.jpg',
    alt: 'The Basin beach and surrounding facilities on Rottnest Island',
    sourceUrl: commonsFile('The_Basin,_Rottnest_Island.jpg'),
    author: 'Hesperian',
    license: 'CC BY 3.0',
    licenseUrl: CC_BY_30
};

const pinkyBeachImage = {
    src: '/beach-images/pinky-beach-01.jpg',
    alt: "Pinky Beach near Pinky's Beach Club on Rottnest Island",
    sourceUrl: commonsFile('Pinky_Beach_1.jpg'),
    author: 'Christophe95',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const bathurstLighthouseImage = {
    src: '/place-images/bathurst-lighthouse-01.jpg',
    alt: 'Bathurst Lighthouse near the Thomson Bay and Transit Reef dive area on Rottnest Island',
    sourceUrl: commonsFile('Bathurst_Lighthouse_on_Rottnest_Island.jpg'),
    author: 'Christophe95',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const parkerPointRoadImage = {
    src: '/place-images/parker-point-road-01.jpg',
    alt: 'Parker Point Road with Wadjemup Lighthouse in the background',
    sourceUrl: commonsFile('Parker_Point_Road_with_Wadjemup_Lighthouse_in_the_background,_April_2026.jpg'),
    author: 'Calistemon',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const parkerPointCoastImage = {
    src: '/beach-images/parker-point-01.jpg',
    alt: 'Coastline near Parker Point facilities on Rottnest Island',
    sourceUrl: commonsFile('Rottnest_Island_coastline_near_Parker_Point_01.jpg'),
    author: 'Pedro Szekely',
    license: 'CC BY-SA 2.0',
    licenseUrl: CC_BY_SA_20
};

const visitorCentreImage = {
    src: '/place-images/visitor-centre-01.jpg',
    alt: 'Rottnest Island Visitor Centre building in Thomson Bay Settlement',
    sourceUrl: commonsFile('Rottnest_Island_VC_2018.jpg'),
    author: 'Vivien Huey Wen Chen',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

const bikeRideImage = {
    src: '/place-images/rottnest-bike-01.jpg',
    alt: 'Bike beside a salt lake on Rottnest Island',
    sourceUrl: commonsFile('Photo_of_Bike_Ride_at_Rottnest_Island_(2).jpg'),
    author: 'Shcmilly',
    license: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40
};

export const PLACE_MEDIA = {
    'The Settlement': [thomsonBaySettlementImage],
    'Wadjemup Lighthouse': [
        {
            src: '/place-images/wadjemup-lighthouse-01.jpg',
            alt: 'Wadjemup Lighthouse on Rottnest Island',
            sourceUrl: commonsFile('Wadjemup_Lighthouse,_April_2026_02.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Bathurst Lighthouse': [bathurstLighthouseImage],
    'Crystal Palace Dive Site': [parkerPointRoadImage],
    'Macedon Shipwreck': [bathurstLighthouseImage],
    'Denton Holme Shipwreck': [bathurstLighthouseImage],
    'Geordie Bay Facilities': [geordieBayImage],
    'The Basin Facilities': [theBasinImage],
    'Parker Point Facilities': [parkerPointCoastImage],
    'Parker Point Bus Stop': [parkerPointRoadImage],
    'Visitor Centre': [visitorCentreImage],
    'Settlement Bike Parking': [bikeRideImage],
    'Army Jetty Water Refill': [thomsonBaySettlementImage],
    'Kingstown Barracks Water Refill': [parkerPointRoadImage],
    'Vlamingh Lookout Water Refill': [bikeRideImage],
    'The Lane Cafe': [thomsonBaySettlementImage],
    'Rottnest Bakery': [thomsonBaySettlementImage],
    Subway: [thomsonBaySettlementImage],
    'Dome Cafe': [thomsonBaySettlementImage],
    "Pinky's Beach Club": [pinkyBeachImage],
    'Hotel Rottnest': [hotelRottnestImage],
    'Bayside Bar': [hotelRottnestImage],
    "Frankie's on Rotto": [thomsonBaySettlementImage],
    Lontara: [hotelRottnestImage],
    'Isola Bar E Cibo': [hotelRottnestImage],
    "Geordie's Cafe & Art Gallery": [geordieBayImage]
};

export function getPlaceImages(placeName) {
    return [...(PLACE_MEDIA[placeName] ?? [])];
}

export function getPrimaryPlaceImage(place) {
    return getPlaceImages(typeof place === 'string' ? place : place?.name)[0] ?? null;
}
