const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const CC_BY_25 = 'https://creativecommons.org/licenses/by/2.5';
const CC_BY_30 = 'https://creativecommons.org/licenses/by/3.0';
const CC_BY_SA_40 = 'https://creativecommons.org/licenses/by-sa/4.0';

function commonsFile(fileName) {
    return `${COMMONS}${fileName}`;
}

export const BEACH_MEDIA = {
    'Henrietta Rocks': [
        {
            src: '/beach-images/henrietta-rocks-01.jpg',
            alt: 'Shipwreck snorkel site at Henrietta Rocks on Rottnest Island',
            sourceUrl: commonsFile("Hopper_barge_%27Shark%27,_Henrietta_Rocks,_Rottnest-1.jpg"),
            author: 'Djanga',
            license: 'CC BY 2.5',
            licenseUrl: CC_BY_25
        }
    ],
    'Little Salmon Bay': [
        {
            src: '/beach-images/little-salmon-bay-01.jpg',
            alt: 'Clear turquoise water and sand at Little Salmon Bay on Rottnest Island',
            sourceUrl: commonsFile('Little_Salmon_Bay,_Rottnest_Island,_April_2026_05.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/little-salmon-bay-02.jpg',
            alt: 'Little Salmon Bay shoreline and reef water on Rottnest Island',
            sourceUrl: commonsFile('Little_Salmon_Bay,_Rottnest_Island,_April_2026_04.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Salmon Bay': [
        {
            src: '/beach-images/salmon-bay-01.jpg',
            alt: 'Salmon Bay beach and southern Rottnest coastline in daylight',
            sourceUrl: commonsFile('Salmon_Bay,_Rottnest_Island,_April_2026_03.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/salmon-bay-02.jpg',
            alt: 'Open beach water and coastal vegetation at Salmon Bay on Rottnest Island',
            sourceUrl: commonsFile('Salmon_Bay,_Rottnest_Island,_April_2026_01.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Green Island': [
        {
            src: '/beach-images/green-island-01.jpg',
            alt: 'Green Island beach and nearshore reef water on Rottnest Island',
            sourceUrl: commonsFile('Green_Island,_Rottnest_Island,_April_2026_02.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/green-island-02.jpg',
            alt: 'Green Island shoreline with blue water and beach access on Rottnest Island',
            sourceUrl: commonsFile('Green_Island,_Rottnest_Island,_April_2026_03.jpg'),
            author: 'Calistemon',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Geordie Bay': [
        {
            src: '/beach-images/geordie-bay-01.jpg',
            alt: 'Geordie Bay water and shoreline seen from an arriving boat',
            sourceUrl: commonsFile('Rottnest_Island_Geordie_Bay.jpg'),
            author: 'Cecilia Broderick',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/geordie-bay-02.jpg',
            alt: 'Geordie Bay beach and settlement coastline on Rottnest Island',
            sourceUrl: commonsFile('Geordie_Bay_on_Rottnest_Island.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Longreach Bay': [
        {
            src: '/beach-images/longreach-bay-01.jpg',
            alt: 'Longreach Bay beach and sheltered water on Rottnest Island',
            sourceUrl: commonsFile('Longreach_Bay_1.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/longreach-bay-02.jpg',
            alt: 'Longreach Bay shoreline and clear water on Rottnest Island',
            sourceUrl: commonsFile('Longreach_Bay_2.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'The Basin': [
        {
            src: '/beach-images/the-basin-01.jpg',
            alt: 'The Basin beach viewed from limestone rocks at Rottnest Island',
            sourceUrl: commonsFile('The_Basin,_Rottnest_Island.jpg'),
            author: 'Hesperian',
            license: 'CC BY 3.0',
            licenseUrl: CC_BY_30
        },
        {
            src: '/beach-images/the-basin-02.jpg',
            alt: 'The Basin on Rottnest Island with bright sand and blue water',
            sourceUrl: commonsFile('The_Basin_on_Rottnest_Island.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ],
    'Pinky Beach': [
        {
            src: '/beach-images/pinky-beach-01.jpg',
            alt: 'Pinky Beach on Rottnest Island with sand, rocks, and clear water',
            sourceUrl: commonsFile('Pinky_Beach_1.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        },
        {
            src: '/beach-images/pinky-beach-02.jpg',
            alt: 'Pinky Beach shoreline and turquoise water on Rottnest Island',
            sourceUrl: commonsFile('Pinky_Beach_2.jpg'),
            author: 'Christophe95',
            license: 'CC BY-SA 4.0',
            licenseUrl: CC_BY_SA_40
        }
    ]
};

export function getBeachImages(beachName) {
    return [...(BEACH_MEDIA[beachName] ?? [])];
}
