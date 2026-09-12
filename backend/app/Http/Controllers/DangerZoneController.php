<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use Illuminate\Http\Request;

class DangerZoneController extends Controller
{
    /**
     * Catalog of Pan-Mindanao logistics danger zones across all 6 regions of Mindanao
     */
    private function getPredefinedDangerZones(): array
    {
        return [
            // Northern Mindanao (Region X)
            [
                'id' => 'dz-puerto-curve',
                'name' => 'Puerto Flyover & Blind Curve',
                'region' => 'Northern Mindanao',
                'category' => 'accident_prone',
                'severity' => 'critical',
                'lat' => 8.4752,
                'lng' => 124.7150,
                'radius' => 750,
                'description' => 'High-speed national highway merging with blind curves and heavy container truck crossover traffic.',
                'advisory' => 'Reduce speed to below 35 km/h. Maintain 50m distance and be alert for sudden braking vehicles.',
            ],
            [
                'id' => 'dz-alae-ascent',
                'name' => 'Alae - Sayre Highway Steep Ascent',
                'region' => 'Northern Mindanao',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 8.4410,
                'lng' => 124.7865,
                'radius' => 950,
                'description' => 'Steep incline and consecutive hairpin turns prone to brake overheating, runaway trucks, and engine stalling.',
                'advisory' => 'Downshift to low gear before the descent. Never ride service brakes continuously; test air pressure beforehand.',
            ],
            [
                'id' => 'dz-mangima-canyon',
                'name' => 'Mangima Canyon Landslide Pass',
                'region' => 'Northern Mindanao',
                'category' => 'landslide',
                'severity' => 'high',
                'lat' => 8.3745,
                'lng' => 124.8620,
                'radius' => 1100,
                'description' => 'Unstable cliff faces subject to rockfalls, mudslides, and reduced visibility during and after rainfall.',
                'advisory' => 'Avoid stopping beneath rock faces. Turn on headlights, keep speed moderate, and watch for debris on tarmac.',
            ],
            [
                'id' => 'dz-agora-flood',
                'name' => 'Agora & Lapasan Coastal Highway',
                'region' => 'Northern Mindanao',
                'category' => 'flood',
                'severity' => 'high',
                'lat' => 8.4905,
                'lng' => 124.6590,
                'radius' => 700,
                'description' => 'Low-elevation coastal arterial prone to sudden flash floods during high tides and heavy downpours.',
                'advisory' => 'Check wading depth before crossing. Reroute via highway flyover if water exceeds 25 cm.',
            ],
            [
                'id' => 'dz-iponan-bridge',
                'name' => 'Iponan River Approach & Bridge',
                'region' => 'Northern Mindanao',
                'category' => 'flood',
                'severity' => 'high',
                'lat' => 8.4940,
                'lng' => 124.5950,
                'radius' => 800,
                'description' => 'River swell prone to overflowing approach roads during upland monsoon rains.',
                'advisory' => 'Proceed with extreme caution when river warning flags are raised. Avoid hydroplaning on bridge edges.',
            ],
            [
                'id' => 'dz-bulua-junction',
                'name' => 'Bulua Westbound Terminal Junction',
                'region' => 'Northern Mindanao',
                'category' => 'accident_prone',
                'severity' => 'high',
                'lat' => 8.5080,
                'lng' => 124.6180,
                'radius' => 650,
                'description' => 'Complex multi-way intersection with dense pedestrian, tricycle, and interprovincial bus traffic.',
                'advisory' => 'Keep speed under 30 km/h. Signal turns well in advance and watch truck blind spots when turning right.',
            ],
            [
                'id' => 'dz-cugman-landslide',
                'name' => 'Cugman Mountain Slopes & Curves',
                'region' => 'Northern Mindanao',
                'category' => 'landslide',
                'severity' => 'moderate',
                'lat' => 8.4820,
                'lng' => 124.6930,
                'radius' => 750,
                'description' => 'Hillside highway section vulnerable to soil loosening and water runoffs during persistent rains.',
                'advisory' => 'Stay centered in your lane. Watch out for slick mud patches and wet gravel on curves.',
            ],
            [
                'id' => 'dz-tablon-chokepoint',
                'name' => 'Tablon Industrial Cargo Chokepoint',
                'region' => 'Northern Mindanao',
                'category' => 'heavy_traffic',
                'severity' => 'moderate',
                'lat' => 8.4910,
                'lng' => 124.7320,
                'radius' => 800,
                'description' => 'High volume of articulated factory trucks entering and exiting narrow industrial spur roads.',
                'advisory' => 'Anticipate slow-moving heavy machinery pulling onto the highway. Leave ample passing space.',
            ],
            [
                'id' => 'dz-impasugong-zigzag',
                'name' => 'Impasug-ong Downhill Zigzag Pass',
                'region' => 'Northern Mindanao',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 8.3120,
                'lng' => 125.0180,
                'radius' => 1200,
                'description' => 'Continuous mountain descent with sharp curves. High historical record of commercial vehicle brake fade.',
                'advisory' => 'Engage engine brake (Jake brake) and 2nd/3rd gear. Check brake drum temperatures before beginning descent.',
            ],
            [
                'id' => 'dz-villanueva-crossing',
                'name' => 'Villanueva Heavy Industrial Corridor',
                'region' => 'Northern Mindanao',
                'category' => 'accident_prone',
                'severity' => 'moderate',
                'lat' => 8.5780,
                'lng' => 124.7750,
                'radius' => 850,
                'description' => 'Intermodal freight access point near port and power plant; frequent fast merging heavy vehicles.',
                'advisory' => 'Be vigilant at unguarded turnarounds. Use horn when passing long multi-axle trailers.',
            ],
            [
                'id' => 'dz-gingoog-curves',
                'name' => 'Gingoog Coastal Mountain S-Curves',
                'region' => 'Northern Mindanao',
                'category' => 'landslide',
                'severity' => 'high',
                'lat' => 8.8240,
                'lng' => 125.1050,
                'radius' => 950,
                'description' => 'Cliffside curves over coastal waters with frequent falling debris and sudden sea-spray slickness.',
                'advisory' => 'Avoid night driving during storms. Keep distance from mountain cuts and reduce speed to 30 km/h.',
            ],
            [
                'id' => 'dz-linamon-kauswagan',
                'name' => 'Linamon Coastal Chokepoint & Curves',
                'region' => 'Northern Mindanao',
                'category' => 'accident_prone',
                'severity' => 'moderate',
                'lat' => 8.1830,
                'lng' => 124.1620,
                'radius' => 800,
                'description' => 'Narrow 2-lane coastal highway with blind corners and unlit seaside curves.',
                'advisory' => 'Watch for sudden motorcycle traffic and pedestrians. Dim high-beams around seaside bends.',
            ],

            // Davao Region (Region XI)
            [
                'id' => 'dz-buda-pass',
                'name' => 'Buda Pass / Marilog Ridge Highway',
                'region' => 'Davao Region',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 7.4950,
                'lng' => 125.2650,
                'radius' => 1400,
                'description' => 'High-elevation mountain pass subject to heavy whiteout fog, slippery wet pavement, and sheer drop-offs.',
                'advisory' => 'CRITICAL: Switch on fog lamps, shift to low gear, keep headlights on. Never attempt overtaking on fog-covered ridges.',
            ],
            [
                'id' => 'dz-santacruz-digos',
                'name' => 'Santa Cruz - Digos Express Freight Corridor',
                'region' => 'Davao Region',
                'category' => 'accident_prone',
                'severity' => 'high',
                'lat' => 6.8320,
                'lng' => 125.4120,
                'radius' => 900,
                'description' => 'High-speed 4-lane straightaway with frequent high-impact head-on collisions and blind U-turns.',
                'advisory' => 'Strictly observe 60 km/h truck speed limit. Do not tailgate fast container vans.',
            ],
            [
                'id' => 'dz-monkayo-mines',
                'name' => 'Monkayo Mining Truck Corridor & Slopes',
                'region' => 'Davao Region',
                'category' => 'landslide',
                'severity' => 'high',
                'lat' => 7.8480,
                'lng' => 126.0520,
                'radius' => 1100,
                'description' => 'Heavy ore haulers merging onto steep mountain roads; frequent mud accumulation and road collapses.',
                'advisory' => 'Beware of deep potholes and red clay slicks. Give way to heavy dump trailers descending the slope.',
            ],
            [
                'id' => 'dz-tagum-madaum',
                'name' => 'Tagum - Madaum Port Intersection',
                'region' => 'Davao Region',
                'category' => 'heavy_traffic',
                'severity' => 'moderate',
                'lat' => 7.4120,
                'lng' => 125.8050,
                'radius' => 800,
                'description' => 'High-density export banana truck junction with long queues of refrigerated container trailers.',
                'advisory' => 'Anticipate slow reefer trucks pulling onto highway. Maintain ample braking clearance.',
            ],
            [
                'id' => 'dz-badas-mati',
                'name' => 'Badas Hairpin Pass (Mati Overlook)',
                'region' => 'Davao Region',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 6.9420,
                'lng' => 126.1850,
                'radius' => 1000,
                'description' => 'Famous mountain zigzags with sharp 180-degree hairpin turns and dramatic drops to the ocean.',
                'advisory' => 'Heavy trucks must take turns wide and horn on blind corners. Check air brakes before entering pass.',
            ],

            // Soccsksargen (Region XII)
            [
                'id' => 'dz-gensan-makar',
                'name' => 'Makar Port Junction & Highway Bypass',
                'region' => 'Soccsksargen',
                'category' => 'heavy_traffic',
                'severity' => 'high',
                'lat' => 6.1820,
                'lng' => 125.1350,
                'radius' => 850,
                'description' => 'Primary tuna & pineapple canning export junction with round-the-clock heavy articulated truck movements.',
                'advisory' => 'Yield to loaded trailer convoys. Use low beam and double check mirrors before changing lanes.',
            ],
            [
                'id' => 'dz-kidapawan-makilala',
                'name' => 'Kidapawan - Makilala Mountain Incline',
                'region' => 'Soccsksargen',
                'category' => 'steep_grade',
                'severity' => 'high',
                'lat' => 6.9620,
                'lng' => 125.0750,
                'radius' => 950,
                'description' => 'Foot-of-Apo mountain descent with rolling curves and agricultural tractor cross-traffic.',
                'advisory' => 'Maintain steady low gear speed. Watch for slow agricultural hauling vehicles during harvest season.',
            ],
            [
                'id' => 'dz-tulunan-mlang',
                'name' => 'Tulunan - M\'lang River Floodplain Corridor',
                'region' => 'Soccsksargen',
                'category' => 'flood',
                'severity' => 'high',
                'lat' => 6.8150,
                'lng' => 124.8950,
                'radius' => 900,
                'description' => 'Low-lying rice plain prone to extensive flash submergence when river dikes overflow.',
                'advisory' => 'Do not cross road sections with active moving water currents. Verify clearance at culvert crossings.',
            ],
            [
                'id' => 'dz-isulan-tacurong',
                'name' => 'Isulan - Tacurong Highway Crossing',
                'region' => 'Soccsksargen',
                'category' => 'accident_prone',
                'severity' => 'moderate',
                'lat' => 6.6980,
                'lng' => 124.6320,
                'radius' => 750,
                'description' => 'High-speed flat provincial junction with high collision rate involving motorbikes and cargo vans.',
                'advisory' => 'Slow down to 40 km/h at intersection approach. Flash headlights at night.',
            ],
            [
                'id' => 'dz-alabel-sarangani',
                'name' => 'Alabel - Malapatan Coastal Cut',
                'region' => 'Soccsksargen',
                'category' => 'landslide',
                'severity' => 'moderate',
                'lat' => 6.0350,
                'lng' => 125.3050,
                'radius' => 800,
                'description' => 'Coastal hillside with active stonefall risks and strong maritime winds affecting high-cube trucks.',
                'advisory' => 'Secure high-sided tarping against crosswinds. Steer away from right-hand ditch cuts.',
            ],

            // Caraga Region (Region XIII)
            [
                'id' => 'dz-agusan-marsh',
                'name' => 'Agusan Marsh Lowlands (Bunawan-Trento)',
                'region' => 'Caraga',
                'category' => 'flood',
                'severity' => 'critical',
                'lat' => 8.1650,
                'lng' => 126.0120,
                'radius' => 1500,
                'description' => 'Vast wetland corridor prone to multi-day highway submergence, soft shoulder collapse, and washouts.',
                'advisory' => 'CRITICAL: Stay strictly on road centerline during rainy periods. Never pull over onto soft marsh shoulders.',
            ],
            [
                'id' => 'dz-cabadbaran-tubay',
                'name' => 'Cabadbaran - Tubay Mining Highway',
                'region' => 'Caraga',
                'category' => 'accident_prone',
                'severity' => 'high',
                'lat' => 9.1550,
                'lng' => 125.5680,
                'radius' => 900,
                'description' => 'Red laterite nickel clay on asphalt creates extremely slick conditions; heavy articulated mining trucks.',
                'advisory' => 'Extremely slippery when wet (like black ice). Increase braking distance threefold.',
            ],
            [
                'id' => 'dz-lipata-surigao',
                'name' => 'Lipata Ferry Terminal Approach & Pass',
                'region' => 'Caraga',
                'category' => 'heavy_traffic',
                'severity' => 'high',
                'lat' => 9.8050,
                'lng' => 125.4650,
                'radius' => 850,
                'description' => 'Long queues of inter-island RoRo cargo trucks parked on curves and narrow approach ramps.',
                'advisory' => 'Expect stopped trucks on road lanes near ferry gate. Sound horn on blind access curves.',
            ],
            [
                'id' => 'dz-bayugan-esperanza',
                'name' => 'Bayugan - Esperanza River Bridge Crossing',
                'region' => 'Caraga',
                'category' => 'flood',
                'severity' => 'moderate',
                'lat' => 8.7150,
                'lng' => 125.7480,
                'radius' => 750,
                'description' => 'River approach subject to flash flooding and swift mud flows during La Niña season.',
                'advisory' => 'Proceed with low speed. Test brakes after passing submerged pavement sections.',
            ],

            // Zamboanga Peninsula (Region IX)
            [
                'id' => 'dz-pagadian-tiguma',
                'name' => 'Tiguma Mountain Zigzag (Pagadian Pass)',
                'region' => 'Zamboanga Peninsula',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 7.8250,
                'lng' => 123.4150,
                'radius' => 1100,
                'description' => 'Notoriously steep mountain zigzag entering Pagadian City with runaway truck catch ramps.',
                'advisory' => 'CRITICAL: Full brake test mandatory at top of hill. Use 1st or 2nd gear only. Watch for runaway truck warning signs.',
            ],
            [
                'id' => 'dz-ipil-tungawan',
                'name' => 'Ipil - Tungawan S-Curves Corridor',
                'region' => 'Zamboanga Peninsula',
                'category' => 'accident_prone',
                'severity' => 'high',
                'lat' => 7.6050,
                'lng' => 122.4550,
                'radius' => 950,
                'description' => 'Series of sharp unbanked reverse S-curves with narrow bridges and no lighting.',
                'advisory' => 'Keep strictly within lane. Sound horn before entering narrow single-lane bridge approaches.',
            ],
            [
                'id' => 'dz-vitali-zamboanga',
                'name' => 'Licuan - Vitali Coastal Ridge',
                'region' => 'Zamboanga Peninsula',
                'category' => 'landslide',
                'severity' => 'high',
                'lat' => 7.3350,
                'lng' => 122.2850,
                'radius' => 900,
                'description' => 'Isolated coastal ridge subject to loose rock slides and poor mobile phone coverage for breakdown support.',
                'advisory' => 'Check spare tire and emergency tool kit before entering this stretch. Drive with extra caution at night.',
            ],
            [
                'id' => 'dz-aurora-molave',
                'name' => 'Aurora - Molave Agricultural Crossing',
                'region' => 'Zamboanga Peninsula',
                'category' => 'accident_prone',
                'severity' => 'moderate',
                'lat' => 7.9550,
                'lng' => 123.5850,
                'radius' => 750,
                'description' => 'Fast truck corridor intersected by slow unlit rice harvesting equipment and grain dryings.',
                'advisory' => 'Watch for grain tarps laid out on road margins and cattle crossings at dusk.',
            ],

            // BARMM / Central Mindanao
            [
                'id' => 'dz-narciso-ramos',
                'name' => 'Narciso Ramos Highway (Malabang-Marogong Pass)',
                'region' => 'BARMM',
                'category' => 'steep_grade',
                'severity' => 'critical',
                'lat' => 7.6250,
                'lng' => 124.1150,
                'radius' => 1200,
                'description' => 'High-altitude mountain highway through dense cloud cover with steep grade drops and winding blind corners.',
                'advisory' => 'Downshift and maintain headlights on. Proceed in daylight convoy when possible.',
            ],
            [
                'id' => 'dz-quirino-bridge',
                'name' => 'Rio Grande de Mindanao / Quirino Bridge Approach',
                'region' => 'BARMM',
                'category' => 'flood',
                'severity' => 'high',
                'lat' => 7.2180,
                'lng' => 124.2380,
                'radius' => 800,
                'description' => 'Major river basin spillway prone to high floodwaters and road inundation during typhoon season.',
                'advisory' => 'Check Cotabato City flood advisories. Do not attempt bridge approach if water reaches road curbing.',
            ],
        ];
    }

    /**
     * Return all active danger zones combined with geocoded incident reports across Mindanao
     */
    public function index()
    {
        $zones = $this->getPredefinedDangerZones();

        // Dynamically pull incidents with coordinates
        try {
            $incidents = IncidentReport::with(['delivery.request'])
                ->whereIn('incident_type', ['accident', 'damage', 'delay'])
                ->get();

            foreach ($incidents as $inc) {
                $req = $inc->delivery?->request;
                if (! $req) continue;

                $lat = $req->dropoff_lat ? (float) $req->dropoff_lat : ($req->pickup_lat ? (float) $req->pickup_lat : null);
                $lng = $req->dropoff_lng ? (float) $req->dropoff_lng : ($req->pickup_lng ? (float) $req->pickup_lng : null);

                if ($lat && $lng) {
                    $zones[] = [
                        'id' => 'incident-' . $inc->incident_id,
                        'name' => 'Past ' . ucfirst($inc->incident_type) . ' Incident',
                        'region' => 'Incident Location',
                        'category' => 'reported_incident',
                        'severity' => $inc->severity === 'high' ? 'critical' : 'high',
                        'lat' => $lat,
                        'lng' => $lng,
                        'radius' => 600,
                        'description' => $inc->description ?: 'Reported incident along this corridor.',
                        'advisory' => 'Exercise elevated caution. Historical hazard or road damage reported at this point.',
                        'reported_at' => $inc->reported_at,
                    ];
                }
            }
        } catch (\Throwable $e) {
            \Log::warning("Failed loading dynamic incident danger zones: " . $e->getMessage());
        }

        return response()->json($zones);
    }
}
