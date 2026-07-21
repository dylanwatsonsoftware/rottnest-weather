const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const CC_BY_30 = 'https://creativecommons.org/licenses/by/3.0';
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
    'Bathurst Lighthouse': [
        {
            src: '/place-images/bathurst-lighthouse-01.jpg',
            alt: 'Bathurst Lighthouse on Rottnest Island',
            sourceUrl: commonsFile('Bathurst_Lighthouse_on_Rottnest_Island.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Geordie Bay Facilities': [geordieBayImage],
    'The Basin Facilities': [theBasinImage],
    'Parker Point Bus Stop': [
        {
            src: '/place-images/parker-point-road-01.jpg',
            alt: 'Parker Point Road with Wadjemup Lighthouse in the background',
            sourceUrl: commonsFile('Parker_Point_Road_with_Wadjemup_Lighthouse_in_the_background,_April_2026.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
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
