/**
 * Talisay (Terminalia catappa) Tree Locations in the Philippines
 * 
 * Talisay trees are widespread across coastal and lowland areas of the Philippines.
 * This data includes known cities, provinces, and regions where Talisay trees
 * (locally called "Talisay" or "Indian Almond") are commonly found.
 * 
 * Coordinates are approximate city/municipality centers.
 * Density: 1 = sparse, 2 = moderate, 3 = abundant
 */

export const TALISAY_LOCATIONS = [
  // ─── NATIONAL CAPITAL REGION (NCR) ───
  { name: 'Manila', lat: 14.5995, lng: 120.9842, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Urban street tree; Rizal Park, Intramuros, and Manila Bay areas' },
  { name: 'Quezon City', lat: 14.6760, lng: 121.0437, province: 'Metro Manila', region: 'NCR', density: 2, note: 'UP Diliman campus, parks, and roadside' },
  { name: 'Pasay', lat: 14.5378, lng: 121.0014, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Cultural Center Complex, Bay Area' },

  // ─── TAGUIG CITY (abundant Talisay throughout) ───
  { name: 'Taguig — BGC Central Park', lat: 14.5476, lng: 121.0538, province: 'Metro Manila', region: 'NCR', density: 3, note: 'Bonifacio Global City — large Talisay trees line the park and open lawns' },
  { name: 'Taguig — Mind Museum Park', lat: 14.5497, lng: 121.0533, province: 'Metro Manila', region: 'NCR', density: 2, note: 'BGC park near Mind Museum, shaded pathways with Talisay' },
  { name: 'Taguig — Kalayaan Park BGC', lat: 14.5520, lng: 121.0500, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Kalayaan Ave area parks in BGC' },
  { name: 'Taguig — Hagonoy', lat: 14.4882, lng: 121.0565, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Lakeshore barangay; Laguna de Bay fringe Talisay trees' },
  { name: 'Taguig — Ligid-Tipas', lat: 14.5012, lng: 121.0631, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Riverside barangay along Napindan channel; Talisay along water edges' },
  { name: 'Taguig — Tuktukan', lat: 14.5278, lng: 121.0625, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Old district of Taguig; Talisay as street shade trees' },
  { name: 'Taguig — Fort Bonifacio', lat: 14.5229, lng: 121.0534, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Heritage zone of former military fort; mature Talisay along old roads' },
  { name: 'Taguig — Western Bicutan', lat: 14.5058, lng: 121.0440, province: 'Metro Manila', region: 'NCR', density: 2, note: 'De La Salle suburb area; residential Talisay shade trees' },
  { name: 'Taguig — Upper Bicutan', lat: 14.5027, lng: 121.0526, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Upper Bicutan community; community parks with Talisay' },
  { name: 'Taguig — Central Bicutan', lat: 14.4981, lng: 121.0481, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Central community; Talisay trees in barangay plazas' },
  { name: 'Taguig — South Signal Village', lat: 14.5157, lng: 121.0546, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Residential area near former Camp Bagong Diwa' },
  { name: 'Taguig — Napindan', lat: 14.5195, lng: 121.0752, province: 'Metro Manila', region: 'NCR', density: 3, note: 'Along Napindan River; dense Talisay groves on riverbanks' },
  { name: 'Taguig — Ususan', lat: 14.4952, lng: 121.0606, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Lakeside barangay; Talisay trees near Laguna de Bay shoreline' },
  { name: 'Taguig — Sta. Ana', lat: 14.5113, lng: 121.0677, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Old riverside barrio; mature Talisay near water' },
  { name: 'Taguig — Ibayo Tipas', lat: 14.5074, lng: 121.0715, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Napindan channel bank; Talisay line the water\'s edge' },
  { name: 'Taguig — PITC Village', lat: 14.5390, lng: 121.0591, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Along C-5 road corridor' },
  { name: 'Taguig — Veterans Village', lat: 14.5301, lng: 121.0506, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Old veterans housing; street-level Talisay' },
  { name: 'Taguig — Bagumbayan', lat: 14.5451, lng: 121.0600, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Near the market; municipal plaza Talisay trees' },
  { name: 'Taguig — Bambang', lat: 14.5345, lng: 121.0649, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Taguig River area; Talisay along embankment' },
  { name: 'Taguig — Calzada Tipas', lat: 14.5166, lng: 121.0647, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Riverside community; mature Talisay in yards and public areas' },
  { name: 'Taguig — Labasan', lat: 14.5243, lng: 121.0694, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Old market barangay; community Talisay trees' },
  { name: 'Taguig — Palingon', lat: 14.5144, lng: 121.0596, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Interior barangay; smaller Talisay in residential yards' },
  { name: 'Taguig — San Miguel', lat: 14.5404, lng: 121.0498, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Near Fort Bonifacio fringe' },
  { name: 'Taguig — Pinagsama', lat: 14.5233, lng: 121.0456, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Near C-5; urban Talisay' },
  { name: 'Taguig — Lower Bicutan', lat: 14.5053, lng: 121.0366, province: 'Metro Manila', region: 'NCR', density: 2, note: 'TESDA compound area; scattered Talisay in government grounds' },
  { name: 'Taguig — Signal Village', lat: 14.5228, lng: 121.0593, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Near Pembo area; urban Talisay' },
  { name: 'Taguig — Wawa', lat: 14.5330, lng: 121.0714, province: 'Metro Manila', region: 'NCR', density: 3, note: 'Wawa riverbank near Laguna Lake; dense streamside Talisay' },

  // ─── OTHER NCR CITIES ───
  { name: 'Paranaque — Tambo', lat: 14.4873, lng: 120.9921, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Las Pinas border; coastal barangay with Talisay' },
  { name: 'Paranaque — Don Galo', lat: 14.4790, lng: 120.9981, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Coastal area near Manila Bay reclamation' },
  { name: 'Las Pinas — Pamplona', lat: 14.4389, lng: 120.9921, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Las Pinas — coastal Talisay near Zapote River' },
  { name: 'Muntinlupa — Alabang', lat: 14.4198, lng: 121.0395, province: 'Metro Manila', region: 'NCR', density: 1, note: 'South Metro; scattered Talisay in parks' },
  { name: 'Muntinlupa — Tunasan', lat: 14.4003, lng: 121.0452, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Laguna de Bay shoreline; lakeside Talisay' },
  { name: 'Pasig — Napindan', lat: 14.5431, lng: 121.0793, province: 'Metro Manila', region: 'NCR', density: 2, note: 'Pasig River banks; riverine Talisay' },
  { name: 'Marikina — Nangka', lat: 14.6329, lng: 121.1061, province: 'Metro Manila', region: 'NCR', density: 1, note: 'Marikina River park' },
  { name: 'Caloocan — Sangandaan', lat: 14.6583, lng: 120.9666, province: 'Metro Manila', region: 'NCR', density: 1, note: 'North district; urban street Talisay' },

  // ─── REGION I – ILOCOS ───
  { name: 'Vigan', lat: 17.5747, lng: 120.3869, province: 'Ilocos Sur', region: 'Region I', density: 2, note: 'Heritage town; old Talisay trees along Calle Crisologo' },
  { name: 'San Fernando', lat: 16.6159, lng: 120.3209, province: 'La Union', region: 'Region I', density: 2, note: 'Coastal areas and public beaches' },
  { name: 'Laoag', lat: 18.1979, lng: 120.5936, province: 'Ilocos Norte', region: 'Region I', density: 1, note: 'Suba Beach, sand dunes area' },
  { name: 'Alaminos', lat: 16.1547, lng: 119.9821, province: 'Pangasinan', region: 'Region I', density: 2, note: 'Hundred Islands area — coastal Talisay' },

  // ─── REGION II – CAGAYAN VALLEY ───
  { name: 'Tuguegarao', lat: 17.6132, lng: 121.7270, province: 'Cagayan', region: 'Region II', density: 1, note: 'Cagayan River banks' },
  { name: 'Santa Ana', lat: 18.4579, lng: 122.1310, province: 'Cagayan', region: 'Region II', density: 2, note: 'Palaui Island, coastal Talisay groves' },

  // ─── REGION III – CENTRAL LUZON ───
  { name: 'Subic', lat: 14.8771, lng: 120.2308, province: 'Zambales', region: 'Region III', density: 2, note: 'Subic Bay area beaches' },
  { name: 'Olongapo', lat: 14.8292, lng: 120.2867, province: 'Zambales', region: 'Region III', density: 2, note: 'Subic Freeport coastal zones' },
  { name: 'Balanga', lat: 14.6770, lng: 120.5376, province: 'Bataan', region: 'Region III', density: 2, note: 'Roosevelt National Park' },
  { name: 'San Fernando', lat: 15.0286, lng: 120.6939, province: 'Pampanga', region: 'Region III', density: 1, note: 'River areas' },

  // ─── REGION IV-A – CALABARZON ───
  { name: 'Talisay', lat: 14.0967, lng: 121.0242, province: 'Batangas', region: 'Region IV-A', density: 3, note: 'Named after the Talisay tree; abundant throughout the city' },
  { name: 'Batangas City', lat: 13.7565, lng: 121.0583, province: 'Batangas', region: 'Region IV-A', density: 2, note: 'Coastal parks and beaches' },
  { name: 'Nasugbu', lat: 14.0678, lng: 120.6328, province: 'Batangas', region: 'Region IV-A', density: 3, note: 'Fortune Island, beaches — dense Talisay groves' },
  { name: 'Calatagan', lat: 13.8326, lng: 120.6305, province: 'Batangas', region: 'Region IV-A', density: 2, note: 'Cape Santiago lighthouse area' },
  { name: 'Lucena', lat: 13.9373, lng: 121.6170, province: 'Quezon', region: 'Region IV-A', density: 2, note: 'Dalahican Beach' },
  { name: 'Real', lat: 14.6628, lng: 121.6074, province: 'Quezon', region: 'Region IV-A', density: 2, note: 'Pacific coast beaches' },
  { name: 'Tagaytay', lat: 14.1153, lng: 120.9621, province: 'Cavite', region: 'Region IV-A', density: 1, note: 'Highlands — limited Talisay' },
  { name: 'Ternate', lat: 14.2855, lng: 120.7167, province: 'Cavite', region: 'Region IV-A', density: 2, note: 'Coastal Talisay near Caylabne Bay' },

  // ─── REGION IV-B – MIMAROPA ───
  { name: 'Puerto Princesa', lat: 9.7392, lng: 118.7353, province: 'Palawan', region: 'Region IV-B', density: 3, note: 'Honda Bay, beaches, Underground River area — dense Talisay' },
  { name: 'El Nido', lat: 11.1784, lng: 119.3929, province: 'Palawan', region: 'Region IV-B', density: 3, note: 'Beach resorts, Bacuit Bay — iconic Talisay trees' },
  { name: 'Coron', lat: 12.0050, lng: 120.2037, province: 'Palawan', region: 'Region IV-B', density: 3, note: 'Coron Island, kayangan Lake area' },
  { name: 'Calapan', lat: 13.4115, lng: 121.1802, province: 'Oriental Mindoro', region: 'Region IV-B', density: 2, note: 'Coastal town center' },
  { name: 'San Jose', lat: 12.3535, lng: 121.0679, province: 'Occidental Mindoro', region: 'Region IV-B', density: 2, note: 'Apo Reef vicinity' },
  { name: 'Boac', lat: 13.4455, lng: 121.8424, province: 'Marinduque', region: 'Region IV-B', density: 2, note: 'Coastal lowlands' },
  { name: 'Romblon', lat: 12.5783, lng: 122.2711, province: 'Romblon', region: 'Region IV-B', density: 2, note: 'Marble island beaches' },

  // ─── REGION V – BICOL ───
  { name: 'Legazpi', lat: 13.1391, lng: 123.7438, province: 'Albay', region: 'Region V', density: 2, note: 'Embarcadero and coastal areas near Mayon' },
  { name: 'Sorsogon City', lat: 12.9742, lng: 124.0049, province: 'Sorsogon', region: 'Region V', density: 2, note: 'Donsol, whale shark area' },
  { name: 'Naga', lat: 13.6192, lng: 123.1814, province: 'Camarines Sur', region: 'Region V', density: 1, note: 'Camaligan area' },
  { name: 'Catanduanes', lat: 13.7097, lng: 124.2422, province: 'Catanduanes', region: 'Region V', density: 2, note: 'Puraran Beach, Twin Rock Beach' },

  // ─── REGION VI – WESTERN VISAYAS ───
  { name: 'Iloilo City', lat: 10.7202, lng: 122.5621, province: 'Iloilo', region: 'Region VI', density: 2, note: 'Esplanade, river walk, old streets' },
  { name: 'Boracay (Malay)', lat: 11.9674, lng: 121.9248, province: 'Aklan', region: 'Region VI', density: 3, note: 'White Beach, Diniwid — iconic Talisay shade trees' },
  { name: 'Kalibo', lat: 11.7072, lng: 122.3680, province: 'Aklan', region: 'Region VI', density: 1, note: 'Ati-Atihan festival grounds' },
  { name: 'Roxas City', lat: 11.5855, lng: 122.7433, province: 'Capiz', region: 'Region VI', density: 2, note: 'Baybay Beach, seafood capital coastal areas' },
  { name: 'Guimaras', lat: 10.5888, lng: 122.6277, province: 'Guimaras', region: 'Region VI', density: 2, note: 'Beach areas of the mango island' },

  // ─── REGION VII – CENTRAL VISAYAS ───
  { name: 'Talisay City', lat: 10.2447, lng: 123.8494, province: 'Cebu', region: 'Region VII', density: 3, note: 'Named after Talisay tree; abundant throughout' },
  { name: 'Cebu City', lat: 10.3157, lng: 123.8854, province: 'Cebu', region: 'Region VII', density: 2, note: 'South Road Properties, Capitol area' },
  { name: 'Lapu-Lapu City', lat: 10.3103, lng: 123.9494, province: 'Cebu', region: 'Region VII', density: 2, note: 'Mactan Island beaches and resorts' },
  { name: 'Moalboal', lat: 9.9494, lng: 123.3962, province: 'Cebu', region: 'Region VII', density: 3, note: 'Panagsama Beach — dense Talisay canopy' },
  { name: 'Oslob', lat: 9.4665, lng: 123.4380, province: 'Cebu', region: 'Region VII', density: 2, note: 'Whale shark watching area, Tumalog Falls' },
  { name: 'Bantayan Island', lat: 11.1682, lng: 123.7270, province: 'Cebu', region: 'Region VII', density: 3, note: 'Sugar Beach, Kota Beach — thick Talisay groves' },
  { name: 'Tagbilaran', lat: 9.6407, lng: 123.8562, province: 'Bohol', region: 'Region VII', density: 2, note: 'Panglao area beaches' },
  { name: 'Panglao', lat: 9.5833, lng: 123.7666, province: 'Bohol', region: 'Region VII', density: 3, note: 'Alona Beach — Talisay-lined beachfront' },
  { name: 'Dumaguete', lat: 9.3068, lng: 123.3054, province: 'Negros Oriental', region: 'Region VII', density: 2, note: 'Rizal Boulevard, university campuses' },
  { name: 'Siquijor', lat: 9.1985, lng: 123.5951, province: 'Siquijor', region: 'Region VII', density: 3, note: 'Old enchanted Talisay tree, Salagdoong Beach' },

  // ─── REGION VIII – EASTERN VISAYAS ───
  { name: 'Tacloban', lat: 11.2543, lng: 124.9612, province: 'Leyte', region: 'Region VIII', density: 2, note: 'San Juanico Bridge area, coastal zones' },
  { name: 'Ormoc', lat: 11.0044, lng: 124.6075, province: 'Leyte', region: 'Region VIII', density: 1, note: 'Lake Danao Nature Park' },
  { name: 'Catbalogan', lat: 11.7756, lng: 124.8861, province: 'Samar', region: 'Region VIII', density: 2, note: 'Samar coastal areas' },

  // ─── REGION IX – ZAMBOANGA PENINSULA ───
  { name: 'Zamboanga City', lat: 6.9214, lng: 122.0790, province: 'Zamboanga del Sur', region: 'Region IX', density: 3, note: 'Paseo del Mar, Great Santa Cruz Island — pink sand beach Talisay' },
  { name: 'Dapitan', lat: 8.6567, lng: 123.4247, province: 'Zamboanga del Norte', region: 'Region IX', density: 2, note: 'Rizal Shrine, Dakak Beach Resort' },

  // ─── REGION X – NORTHERN MINDANAO ───
  { name: 'Cagayan de Oro', lat: 8.4542, lng: 124.6319, province: 'Misamis Oriental', region: 'Region X', density: 2, note: 'Divisoria, Xavier University campus' },
  { name: 'Camiguin', lat: 9.1733, lng: 124.7290, province: 'Camiguin', region: 'Region X', density: 3, note: 'White Island, Mantigue Island — lush Talisay' },
  { name: 'Bukidnon', lat: 8.0515, lng: 125.0492, province: 'Bukidnon', region: 'Region X', density: 1, note: 'Highlands — limited but present in lower areas' },

  // ─── REGION XI – DAVAO ───
  { name: 'Davao City', lat: 7.1907, lng: 125.4553, province: 'Davao del Sur', region: 'Region XI', density: 3, note: 'Samal Island, People\'s Park, Jack\'s Ridge' },
  { name: 'Island Garden City of Samal', lat: 7.0733, lng: 125.7275, province: 'Davao del Norte', region: 'Region XI', density: 3, note: 'Beach resorts, coral gardens area' },
  { name: 'Mati', lat: 6.9554, lng: 126.2166, province: 'Davao Oriental', region: 'Region XI', density: 2, note: 'Dahican Beach, surfing area' },
  { name: 'Digos', lat: 6.7498, lng: 125.3572, province: 'Davao del Sur', region: 'Region XI', density: 1, note: 'Mt. Apo base area' },

  // ─── REGION XII – SOCCSKSARGEN ───
  { name: 'General Santos', lat: 6.1164, lng: 125.1716, province: 'South Cotabato', region: 'Region XII', density: 2, note: 'Tuna Capital coastal areas, Sarangani Bay' },
  { name: 'Sarangani', lat: 5.9269, lng: 125.4632, province: 'Sarangani', region: 'Region XII', density: 2, note: 'Gumasa Beach — Talisay-shaded coastline' },
  { name: 'Koronadal', lat: 6.5022, lng: 124.8469, province: 'South Cotabato', region: 'Region XII', density: 1, note: 'Lake Sebu access town' },

  // ─── REGION XIII – CARAGA ───
  { name: 'Surigao City', lat: 9.7571, lng: 125.5138, province: 'Surigao del Norte', region: 'Region XIII', density: 2, note: 'Day-asan floating village area' },
  { name: 'Siargao (General Luna)', lat: 9.8468, lng: 126.0930, province: 'Surigao del Norte', region: 'Region XIII', density: 3, note: 'Cloud 9, Pacifico Beach — iconic surfing Talisay trees' },
  { name: 'Butuan', lat: 8.9475, lng: 125.5406, province: 'Agusan del Norte', region: 'Region XIII', density: 2, note: 'Agusan River delta' },
  { name: 'Bislig', lat: 8.2150, lng: 126.3513, province: 'Surigao del Sur', region: 'Region XIII', density: 2, note: 'Tinuy-an Falls area' },

  // ─── CAR – CORDILLERA ───
  { name: 'Baguio', lat: 16.4023, lng: 120.5960, province: 'Benguet', region: 'CAR', density: 1, note: 'Highlands — rare Talisay, mostly in lower Kennon Road' },

  // ─── BARMM – BANGSAMORO ───
  { name: 'Cotabato City', lat: 7.2236, lng: 124.2464, province: 'Maguindanao', region: 'BARMM', density: 1, note: 'Kutawato River banks' },
  { name: 'Lamitan', lat: 6.6500, lng: 122.1333, province: 'Basilan', region: 'BARMM', density: 2, note: 'Basilan coastal towns' },
  { name: 'Jolo', lat: 6.0522, lng: 121.0022, province: 'Sulu', region: 'BARMM', density: 2, note: 'Sulu archipelago beaches' },
  { name: 'Bongao', lat: 5.0293, lng: 119.7733, province: 'Tawi-Tawi', region: 'BARMM', density: 3, note: 'Simunul Island, southernmost Talisay groves' },
];

// Summary statistics
export const LOCATION_STATS = {
  totalLocations: TALISAY_LOCATIONS.length,
  totalRegions: [...new Set(TALISAY_LOCATIONS.map(l => l.region))].length,
  totalProvinces: [...new Set(TALISAY_LOCATIONS.map(l => l.province))].length,
  abundantLocations: TALISAY_LOCATIONS.filter(l => l.density === 3).length,
  moderateLocations: TALISAY_LOCATIONS.filter(l => l.density === 2).length,
  sparseLocations: TALISAY_LOCATIONS.filter(l => l.density === 1).length,
};
