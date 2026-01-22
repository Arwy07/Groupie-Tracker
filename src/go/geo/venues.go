package geo

import (
	"strings"

	"groupie/src/go/models"
)

// VenueCoordinates contient les coordonnées prédéfinies des salles de concert et villes connues
var VenueCoordinates = map[string]models.Coordinates{
	// France
	"paris":            {Latitude: 48.8566, Longitude: 2.3522},
	"paris france":     {Latitude: 48.8566, Longitude: 2.3522},
	"france":           {Latitude: 46.2276, Longitude: 2.2137},
	"lyon":             {Latitude: 45.7640, Longitude: 4.8357},
	"marseille":        {Latitude: 43.2965, Longitude: 5.3698},
	"toulouse":         {Latitude: 43.6047, Longitude: 1.4442},
	"bordeaux":         {Latitude: 44.8378, Longitude: -0.5792},
	"lille":            {Latitude: 50.6292, Longitude: 3.0573},
	"nantes":           {Latitude: 47.2184, Longitude: -1.5536},
	"nice":             {Latitude: 43.7102, Longitude: 7.2620},
	"strasbourg":       {Latitude: 48.5734, Longitude: 7.7521},
	"montpellier":      {Latitude: 43.6108, Longitude: 3.8767},
	"rennes":           {Latitude: 48.1173, Longitude: -1.6778},
	"la defense arena": {Latitude: 48.8958, Longitude: 2.2304},
	"accor arena":      {Latitude: 48.8387, Longitude: 2.3784},
	"stade de france":  {Latitude: 48.9244, Longitude: 2.3601},
	"olympia":          {Latitude: 48.8698, Longitude: 2.3281},
	"zenith paris":     {Latitude: 48.8936, Longitude: 2.3931},
	"cannes":           {Latitude: 43.5528, Longitude: 7.0174},

	// USA
	"new york":              {Latitude: 40.7128, Longitude: -74.0060},
	"new york usa":          {Latitude: 40.7128, Longitude: -74.0060},
	"new york city":         {Latitude: 40.7128, Longitude: -74.0060},
	"los angeles":           {Latitude: 34.0522, Longitude: -118.2437},
	"los angeles usa":       {Latitude: 34.0522, Longitude: -118.2437},
	"chicago":               {Latitude: 41.8781, Longitude: -87.6298},
	"houston":               {Latitude: 29.7604, Longitude: -95.3698},
	"phoenix":               {Latitude: 33.4484, Longitude: -112.0740},
	"philadelphia":          {Latitude: 39.9526, Longitude: -75.1652},
	"san antonio":           {Latitude: 29.4241, Longitude: -98.4936},
	"san diego":             {Latitude: 32.7157, Longitude: -117.1611},
	"dallas":                {Latitude: 32.7767, Longitude: -96.7970},
	"san jose":              {Latitude: 37.3382, Longitude: -121.8863},
	"austin":                {Latitude: 30.2672, Longitude: -97.7431},
	"san francisco":         {Latitude: 37.7749, Longitude: -122.4194},
	"seattle":               {Latitude: 47.6062, Longitude: -122.3321},
	"denver":                {Latitude: 39.7392, Longitude: -104.9903},
	"washington":            {Latitude: 38.9072, Longitude: -77.0369},
	"boston":                {Latitude: 42.3601, Longitude: -71.0589},
	"nashville":             {Latitude: 36.1627, Longitude: -86.7816},
	"las vegas":             {Latitude: 36.1699, Longitude: -115.1398},
	"detroit":               {Latitude: 42.3314, Longitude: -83.0458},
	"portland":              {Latitude: 45.5152, Longitude: -122.6784},
	"memphis":               {Latitude: 35.1495, Longitude: -90.0490},
	"atlanta":               {Latitude: 33.7490, Longitude: -84.3880},
	"miami":                 {Latitude: 25.7617, Longitude: -80.1918},
	"usa":                   {Latitude: 37.0902, Longitude: -95.7129},
	"madison square garden": {Latitude: 40.7505, Longitude: -73.9934},
	"hollywood bowl":        {Latitude: 34.1122, Longitude: -118.3390},
	"red rocks":             {Latitude: 39.6654, Longitude: -105.2057},
	"indianapolis":          {Latitude: 39.7684, Longitude: -86.1581},
	"columbus":              {Latitude: 39.9612, Longitude: -82.9988},
	"charlotte":             {Latitude: 35.2271, Longitude: -80.8431},
	"jacksonville":          {Latitude: 30.3322, Longitude: -81.6557},
	"fort worth":            {Latitude: 32.7555, Longitude: -97.3308},
	"oakland":               {Latitude: 37.8044, Longitude: -122.2712},
	"minneapolis":           {Latitude: 44.9778, Longitude: -93.2650},
	"cleveland":             {Latitude: 41.4993, Longitude: -81.6944},
	"pittsburgh":            {Latitude: 40.4406, Longitude: -79.9959},
	"new orleans":           {Latitude: 29.9511, Longitude: -90.0715},
	"st louis":              {Latitude: 38.6270, Longitude: -90.1994},
	"kansas city":           {Latitude: 39.0997, Longitude: -94.5786},
	"cincinnati":            {Latitude: 39.1031, Longitude: -84.5120},
	"milwaukee":             {Latitude: 43.0389, Longitude: -87.9065},
	"baltimore":             {Latitude: 39.2904, Longitude: -76.6122},
	"salt lake city":        {Latitude: 40.7608, Longitude: -111.8910},
	"sacramento":            {Latitude: 38.5816, Longitude: -121.4944},
	"raleigh":               {Latitude: 35.7796, Longitude: -78.6382},
	"tampa":                 {Latitude: 27.9506, Longitude: -82.4572},
	"orlando":               {Latitude: 28.5383, Longitude: -81.3792},

	// UK
	"london":          {Latitude: 51.5074, Longitude: -0.1278},
	"london uk":       {Latitude: 51.5074, Longitude: -0.1278},
	"manchester":      {Latitude: 53.4808, Longitude: -2.2426},
	"birmingham":      {Latitude: 52.4862, Longitude: -1.8904},
	"glasgow":         {Latitude: 55.8642, Longitude: -4.2518},
	"liverpool":       {Latitude: 53.4084, Longitude: -2.9916},
	"edinburgh":       {Latitude: 55.9533, Longitude: -3.1883},
	"leeds":           {Latitude: 53.8008, Longitude: -1.5491},
	"bristol":         {Latitude: 51.4545, Longitude: -2.5879},
	"cardiff":         {Latitude: 51.4816, Longitude: -3.1791},
	"nottingham":      {Latitude: 52.9548, Longitude: -1.1581},
	"sheffield":       {Latitude: 53.3811, Longitude: -1.4701},
	"newcastle":       {Latitude: 54.9783, Longitude: -1.6178},
	"brighton":        {Latitude: 50.8225, Longitude: -0.1372},
	"uk":              {Latitude: 55.3781, Longitude: -3.4360},
	"o2 arena":        {Latitude: 51.5030, Longitude: 0.0032},
	"wembley":         {Latitude: 51.5560, Longitude: -0.2795},
	"wembley stadium": {Latitude: 51.5560, Longitude: -0.2795},

	// Germany
	"berlin":     {Latitude: 52.5200, Longitude: 13.4050},
	"munich":     {Latitude: 48.1351, Longitude: 11.5820},
	"hamburg":    {Latitude: 53.5511, Longitude: 9.9937},
	"frankfurt":  {Latitude: 50.1109, Longitude: 8.6821},
	"cologne":    {Latitude: 50.9375, Longitude: 6.9603},
	"dusseldorf": {Latitude: 51.2277, Longitude: 6.7735},
	"stuttgart":  {Latitude: 48.7758, Longitude: 9.1829},
	"germany":    {Latitude: 51.1657, Longitude: 10.4515},
	"hannover":   {Latitude: 52.3759, Longitude: 9.7320},
	"leipzig":    {Latitude: 51.3397, Longitude: 12.3731},
	"dresden":    {Latitude: 51.0504, Longitude: 13.7373},
	"nuremberg":  {Latitude: 49.4521, Longitude: 11.0767},

	// Spain
	"madrid":    {Latitude: 40.4168, Longitude: -3.7038},
	"barcelona": {Latitude: 41.3851, Longitude: 2.1734},
	"valencia":  {Latitude: 39.4699, Longitude: -0.3763},
	"seville":   {Latitude: 37.3891, Longitude: -5.9845},
	"bilbao":    {Latitude: 43.2630, Longitude: -2.9350},
	"spain":     {Latitude: 40.4637, Longitude: -3.7492},
	"malaga":    {Latitude: 36.7213, Longitude: -4.4214},
	"zaragoza":  {Latitude: 41.6488, Longitude: -0.8891},

	// Italy
	"rome":     {Latitude: 41.9028, Longitude: 12.4964},
	"milan":    {Latitude: 45.4642, Longitude: 9.1900},
	"naples":   {Latitude: 40.8518, Longitude: 14.2681},
	"turin":    {Latitude: 45.0703, Longitude: 7.6869},
	"florence": {Latitude: 43.7696, Longitude: 11.2558},
	"italy":    {Latitude: 41.8719, Longitude: 12.5674},
	"bologna":  {Latitude: 44.4949, Longitude: 11.3426},
	"venice":   {Latitude: 45.4408, Longitude: 12.3155},
	"genoa":    {Latitude: 44.4056, Longitude: 8.9463},
	"verona":   {Latitude: 45.4384, Longitude: 10.9916},
	"palermo":  {Latitude: 38.1157, Longitude: 13.3615},

	// Netherlands
	"amsterdam":   {Latitude: 52.3676, Longitude: 4.9041},
	"rotterdam":   {Latitude: 51.9244, Longitude: 4.4777},
	"netherlands": {Latitude: 52.1326, Longitude: 5.2913},
	"utrecht":     {Latitude: 52.0907, Longitude: 5.1214},

	// Belgium
	"brussels": {Latitude: 50.8503, Longitude: 4.3517},
	"antwerp":  {Latitude: 51.2194, Longitude: 4.4025},
	"belgium":  {Latitude: 50.5039, Longitude: 4.4699},

	// Switzerland
	"zurich":      {Latitude: 47.3769, Longitude: 8.5417},
	"geneva":      {Latitude: 46.2044, Longitude: 6.1432},
	"switzerland": {Latitude: 46.8182, Longitude: 8.2275},
	"basel":       {Latitude: 47.5596, Longitude: 7.5886},
	"bern":        {Latitude: 46.9480, Longitude: 7.4474},

	// Austria
	"vienna":  {Latitude: 48.2082, Longitude: 16.3738},
	"austria": {Latitude: 47.5162, Longitude: 14.5501},

	// Sweden
	"stockholm":  {Latitude: 59.3293, Longitude: 18.0686},
	"gothenburg": {Latitude: 57.7089, Longitude: 11.9746},
	"malmo":      {Latitude: 55.6049, Longitude: 13.0038},
	"sweden":     {Latitude: 60.1282, Longitude: 18.6435},

	// Norway
	"oslo":   {Latitude: 59.9139, Longitude: 10.7522},
	"bergen": {Latitude: 60.3913, Longitude: 5.3221},
	"norway": {Latitude: 60.4720, Longitude: 8.4689},

	// Denmark
	"copenhagen": {Latitude: 55.6761, Longitude: 12.5683},
	"aarhus":     {Latitude: 56.1629, Longitude: 10.2039},
	"denmark":    {Latitude: 56.2639, Longitude: 9.5018},

	// Finland
	"helsinki": {Latitude: 60.1699, Longitude: 24.9384},
	"finland":  {Latitude: 61.9241, Longitude: 25.7482},

	// Poland
	"warsaw":  {Latitude: 52.2297, Longitude: 21.0122},
	"krakow":  {Latitude: 50.0647, Longitude: 19.9450},
	"poland":  {Latitude: 51.9194, Longitude: 19.1451},
	"gdansk":  {Latitude: 54.3520, Longitude: 18.6466},
	"wroclaw": {Latitude: 51.1079, Longitude: 17.0385},
	"poznan":  {Latitude: 52.4064, Longitude: 16.9252},

	// Portugal
	"lisbon":   {Latitude: 38.7223, Longitude: -9.1393},
	"porto":    {Latitude: 41.1579, Longitude: -8.6291},
	"portugal": {Latitude: 39.3999, Longitude: -8.2245},

	// Ireland
	"dublin":  {Latitude: 53.3498, Longitude: -6.2603},
	"cork":    {Latitude: 51.8969, Longitude: -8.4863},
	"galway":  {Latitude: 53.2707, Longitude: -9.0568},
	"ireland": {Latitude: 53.1424, Longitude: -7.6921},

	// Russia
	"moscow":           {Latitude: 55.7558, Longitude: 37.6173},
	"saint petersburg": {Latitude: 59.9311, Longitude: 30.3609},
	"st petersburg":    {Latitude: 59.9311, Longitude: 30.3609},
	"russia":           {Latitude: 61.5240, Longitude: 105.3188},

	// Czech Republic
	"prague": {Latitude: 50.0755, Longitude: 14.4378},

	// Hungary
	"budapest": {Latitude: 47.4979, Longitude: 19.0402},
	"hungary":  {Latitude: 47.1625, Longitude: 19.5033},

	// Romania
	"bucharest": {Latitude: 44.4268, Longitude: 26.1025},

	// Greece
	"athens": {Latitude: 37.9838, Longitude: 23.7275},
	"greece": {Latitude: 39.0742, Longitude: 21.8243},

	// Turkey
	"istanbul": {Latitude: 41.0082, Longitude: 28.9784},
	"ankara":   {Latitude: 39.9334, Longitude: 32.8597},
	"turkey":   {Latitude: 38.9637, Longitude: 35.2433},

	// Canada
	"toronto":   {Latitude: 43.6532, Longitude: -79.3832},
	"vancouver": {Latitude: 49.2827, Longitude: -123.1207},
	"montreal":  {Latitude: 45.5017, Longitude: -73.5673},
	"calgary":   {Latitude: 51.0447, Longitude: -114.0719},
	"ottawa":    {Latitude: 45.4215, Longitude: -75.6972},
	"edmonton":  {Latitude: 53.5461, Longitude: -113.4938},
	"quebec":    {Latitude: 46.8139, Longitude: -71.2080},
	"winnipeg":  {Latitude: 49.8951, Longitude: -97.1384},
	"canada":    {Latitude: 56.1304, Longitude: -106.3468},

	// Australia
	"sydney":    {Latitude: -33.8688, Longitude: 151.2093},
	"melbourne": {Latitude: -37.8136, Longitude: 144.9631},
	"brisbane":  {Latitude: -27.4698, Longitude: 153.0251},
	"perth":     {Latitude: -31.9505, Longitude: 115.8605},
	"adelaide":  {Latitude: -34.9285, Longitude: 138.6007},
	"australia": {Latitude: -25.2744, Longitude: 133.7751},

	// New Zealand
	"auckland":    {Latitude: -36.8509, Longitude: 174.7645},
	"wellington":  {Latitude: -41.2866, Longitude: 174.7756},
	"new zealand": {Latitude: -40.9006, Longitude: 174.8860},

	// Japan
	"tokyo":      {Latitude: 35.6762, Longitude: 139.6503},
	"osaka":      {Latitude: 34.6937, Longitude: 135.5023},
	"kyoto":      {Latitude: 35.0116, Longitude: 135.7681},
	"japan":      {Latitude: 36.2048, Longitude: 138.2529},
	"tokyo dome": {Latitude: 35.7056, Longitude: 139.7519},
	"nagoya":     {Latitude: 35.1815, Longitude: 136.9066},
	"fukuoka":    {Latitude: 33.5904, Longitude: 130.4017},
	"sapporo":    {Latitude: 43.0618, Longitude: 141.3545},

	// South Korea
	"seoul":       {Latitude: 37.5665, Longitude: 126.9780},
	"busan":       {Latitude: 35.1796, Longitude: 129.0756},
	"south korea": {Latitude: 35.9078, Longitude: 127.7669},

	// China
	"beijing":   {Latitude: 39.9042, Longitude: 116.4074},
	"shanghai":  {Latitude: 31.2304, Longitude: 121.4737},
	"hong kong": {Latitude: 22.3193, Longitude: 114.1694},
	"china":     {Latitude: 35.8617, Longitude: 104.1954},
	"shenzhen":  {Latitude: 22.5431, Longitude: 114.0579},
	"guangzhou": {Latitude: 23.1291, Longitude: 113.2644},

	// India
	"mumbai":    {Latitude: 19.0760, Longitude: 72.8777},
	"delhi":     {Latitude: 28.7041, Longitude: 77.1025},
	"bangalore": {Latitude: 12.9716, Longitude: 77.5946},
	"chennai":   {Latitude: 13.0827, Longitude: 80.2707},
	"kolkata":   {Latitude: 22.5726, Longitude: 88.3639},
	"india":     {Latitude: 20.5937, Longitude: 78.9629},

	// Southeast Asia
	"singapore":    {Latitude: 1.3521, Longitude: 103.8198},
	"bangkok":      {Latitude: 13.7563, Longitude: 100.5018},
	"thailand":     {Latitude: 15.8700, Longitude: 100.9925},
	"kuala lumpur": {Latitude: 3.1390, Longitude: 101.6869},
	"malaysia":     {Latitude: 4.2105, Longitude: 101.9758},
	"jakarta":      {Latitude: -6.2088, Longitude: 106.8456},
	"indonesia":    {Latitude: -0.7893, Longitude: 113.9213},
	"manila":       {Latitude: 14.5995, Longitude: 120.9842},
	"philippines":  {Latitude: 12.8797, Longitude: 121.7740},
	"taipei":       {Latitude: 25.0330, Longitude: 121.5654},
	"taiwan":       {Latitude: 23.6978, Longitude: 120.9605},
	"ho chi minh":  {Latitude: 10.8231, Longitude: 106.6297},
	"hanoi":        {Latitude: 21.0278, Longitude: 105.8342},
	"vietnam":      {Latitude: 14.0583, Longitude: 108.2772},

	// Middle East
	"tel aviv":  {Latitude: 32.0853, Longitude: 34.7818},
	"israel":    {Latitude: 31.0461, Longitude: 34.8516},
	"dubai":     {Latitude: 25.2048, Longitude: 55.2708},
	"uae":       {Latitude: 23.4241, Longitude: 53.8478},
	"abu dhabi": {Latitude: 24.4539, Longitude: 54.3773},
	"doha":      {Latitude: 25.2854, Longitude: 51.5310},
	"qatar":     {Latitude: 25.3548, Longitude: 51.1839},

	// Africa
	"johannesburg": {Latitude: -26.2041, Longitude: 28.0473},
	"cape town":    {Latitude: -33.9249, Longitude: 18.4241},
	"durban":       {Latitude: -29.8587, Longitude: 31.0218},
	"south africa": {Latitude: -30.5595, Longitude: 22.9375},
	"cairo":        {Latitude: 30.0444, Longitude: 31.2357},
	"egypt":        {Latitude: 26.8206, Longitude: 30.8025},

	// Latin America
	"sao paulo":      {Latitude: -23.5505, Longitude: -46.6333},
	"rio de janeiro": {Latitude: -22.9068, Longitude: -43.1729},
	"brazil":         {Latitude: -14.2350, Longitude: -51.9253},
	"buenos aires":   {Latitude: -34.6037, Longitude: -58.3816},
	"argentina":      {Latitude: -38.4161, Longitude: -63.6167},
	"mexico city":    {Latitude: 19.4326, Longitude: -99.1332},
	"guadalajara":    {Latitude: 20.6597, Longitude: -103.3496},
	"monterrey":      {Latitude: 25.6866, Longitude: -100.3161},
	"mexico":         {Latitude: 23.6345, Longitude: -102.5528},
	"santiago":       {Latitude: -33.4489, Longitude: -70.6693},
	"chile":          {Latitude: -35.6751, Longitude: -71.5430},
	"bogota":         {Latitude: 4.7110, Longitude: -74.0721},
	"colombia":       {Latitude: 4.5709, Longitude: -74.2973},
	"lima":           {Latitude: -12.0464, Longitude: -77.0428},
	"peru":           {Latitude: -9.1900, Longitude: -75.0152},

	// Iceland & other Nordic
	"reykjavik": {Latitude: 64.1466, Longitude: -21.9426},
	"iceland":   {Latitude: 64.9631, Longitude: -19.0208},

	// Balkans & Eastern Europe
	"sofia":     {Latitude: 42.6977, Longitude: 23.3219},
	"bulgaria":  {Latitude: 42.7339, Longitude: 25.4858},
	"belgrade":  {Latitude: 44.7866, Longitude: 20.4489},
	"serbia":    {Latitude: 44.0165, Longitude: 21.0059},
	"zagreb":    {Latitude: 45.8150, Longitude: 15.9819},
	"croatia":   {Latitude: 45.1000, Longitude: 15.2000},
	"ljubljana": {Latitude: 46.0569, Longitude: 14.5058},
	"slovenia":  {Latitude: 46.1512, Longitude: 14.9955},
	"sarajevo":  {Latitude: 43.8563, Longitude: 18.4131},
	"skopje":    {Latitude: 41.9981, Longitude: 21.4254},
	"tirana":    {Latitude: 41.3275, Longitude: 19.8187},
	"kiev":      {Latitude: 50.4501, Longitude: 30.5234},
	"kyiv":      {Latitude: 50.4501, Longitude: 30.5234},
	"ukraine":   {Latitude: 48.3794, Longitude: 31.1656},
	"minsk":     {Latitude: 53.9006, Longitude: 27.5590},
	"belarus":   {Latitude: 53.7098, Longitude: 27.9534},

	// Small European states
	"luxembourg": {Latitude: 49.8153, Longitude: 6.1296},
	"monaco":     {Latitude: 43.7384, Longitude: 7.4246},
	"andorra":    {Latitude: 42.5063, Longitude: 1.5218},
	"malta":      {Latitude: 35.9375, Longitude: 14.3754},

	// Baltic states
	"vilnius":   {Latitude: 54.6872, Longitude: 25.2797},
	"lithuania": {Latitude: 55.1694, Longitude: 23.8813},
	"riga":      {Latitude: 56.9496, Longitude: 24.1052},
	"latvia":    {Latitude: 56.8796, Longitude: 24.6032},
	"tallinn":   {Latitude: 59.4370, Longitude: 24.7536},
	"estonia":   {Latitude: 58.5953, Longitude: 25.0136},
}

// GetVenueCoordinates retourne les coordonnées pour un lieu donné
func GetVenueCoordinates(location string) (*models.Coordinates, bool) {
	// Normaliser le lieu: minuscules, remplacer _ et - par espace
	key := strings.ToLower(strings.TrimSpace(location))
	key = strings.ReplaceAll(key, "_", " ")
	key = strings.ReplaceAll(key, "-", " ")
	key = strings.ReplaceAll(key, ",", " ")
	key = strings.Join(strings.Fields(key), " ") // normaliser espaces

	// Recherche exacte
	if coords, ok := VenueCoordinates[key]; ok {
		return &coords, true
	}

	// Recherche par parties (ville, pays)
	parts := strings.Fields(key)
	if len(parts) >= 1 {
		cityPart := parts[0]
		if coords, ok := VenueCoordinates[cityPart]; ok {
			return &coords, true
		}
		// Essayer les deux premiers mots
		if len(parts) >= 2 {
			twoWords := parts[0] + " " + parts[1]
			if coords, ok := VenueCoordinates[twoWords]; ok {
				return &coords, true
			}
		}
	}

	// Recherche partielle - vérifie si le lieu contient un mot-clé connu
	for venueKey, coords := range VenueCoordinates {
		// Ignorer les clés trop courtes (comme "uk", "usa")
		if len(venueKey) < 4 {
			continue
		}
		if strings.Contains(key, venueKey) {
			return &coords, true
		}
	}

	return nil, false
}
