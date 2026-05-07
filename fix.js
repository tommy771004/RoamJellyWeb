import fs from 'fs';

let content = fs.readFileSync('src/components/ItineraryTab.tsx', 'utf-8');

// Imports
content = content.replace(/import \{ View, Text, TouchableOpacity, ScrollView, TextInput \} from 'react-native';/, '');
content = content.replace(/import Svg, \{ Line as SvgLine \} from 'react-native-svg';/, '');

// Tag replacements
content = content.replace(/<View/g, '<div');
content = content.replace(/<\/View>/g, '</div>');

content = content.replace(/<Text/g, '<span');
content = content.replace(/<\/Text>/g, '</span>');

content = content.replace(/<TouchableOpacity/g, '<button');
content = content.replace(/<\/TouchableOpacity>/g, '</button>');

content = content.replace(/<ScrollView/g, '<div className="overflow-auto"');
content = content.replace(/<\/ScrollView>/g, '</div>');

content = content.replace(/<TextInput/g, '<input');

content = content.replace(/<Svg/g, '<svg');
content = content.replace(/<\/Svg>/g, '</svg>');

content = content.replace(/<SvgLineComp/g, '<line');

// Specific props
content = content.replace(/onPress=\{/g, 'onClick=\{');
content = content.replace(/keyboardType="number-pad"/g, 'inputMode="numeric"');
content = content.replace(/showsHorizontalScrollIndicator=\{false\}/g, '');
content = content.replace(/contentContainerStyle=\{\{ gap: 8 \}\}/g, 'style=\{\{ gap: 8 \}\}');
content = content.replace(/contentContainerStyle=\{\{ gap: 6 \}\}/g, 'style=\{\{ gap: 6 \}\}');

// onChangeText replacements (manual since there are only a few variants)
content = content.replace(/onChangeText=\{\(value: string\) => setPlannerField\('days', Math.max\(1, Number\(value\) \|\| 1\)\)\}/, 
  "onChange={(e) => setPlannerField('days', Math.max(1, Number(e.target.value) || 1))}");

content = content.replace(/onChangeText=\{\(value: string\) => setPlannerField\('flightDate', value\)\}/, 
  "onChange={(e) => setPlannerField('flightDate', e.target.value)}");

content = content.replace(/onChangeText=\{\(value: string\) => setPlannerField\('departureFrom', value.toUpperCase\(\)\)\}/, 
  "onChange={(e) => setPlannerField('departureFrom', e.target.value.toUpperCase())}");

content = content.replace(/onChangeText=\{\(value: string\) => setPlannerField\('arrivalTo', value.toUpperCase\(\)\)\}/, 
  "onChange={(e) => setPlannerField('arrivalTo', e.target.value.toUpperCase())}");

content = content.replace(/onChangeText=\{setPlannerCsvField\('countries'\)\}/, 
  "onChange={(e) => setPlannerCsvField('countries')(e.target.value)}");

content = content.replace(/onChangeText=\{setPlannerCsvField\('mustVisitSpots'\)\}/, 
  "onChange={(e) => setPlannerCsvField('mustVisitSpots')(e.target.value)}");

content = content.replace(/onChangeText=\{setPlannerCsvField\('mustEatFoods'\)\}/, 
  "onChange={(e) => setPlannerCsvField('mustEatFoods')(e.target.value)}");

content = content.replace(/onChangeText=\{\(value: string\) => setPlannerField\('notes', value\)\}/, 
  "onChange={(e) => setPlannerField('notes', e.target.value)}");

content = content.replace(/onChangeText=\{setNewSpotTitle\}/, 
  "onChange={(e) => setNewSpotTitle(e.target.value)}");

content = content.replace(/onChangeText=\{\(value: string\) =>\n\s*setDraft\(\(prev: EditDraft \| null\) => \(prev \? \{ \.\.\.prev, day: value \} : prev\)\)\n\s*\}/, 
  "onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, day: e.target.value } : prev))}");

content = content.replace(/onChangeText=\{\(value: string\) =>\n\s*setDraft\(\(prev: EditDraft \| null\) => \(prev \? \{ \.\.\.prev, time: value \} : prev\)\)\n\s*\}/, 
  "onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, time: e.target.value } : prev))}");

content = content.replace(/onChangeText=\{\(value: string\) =>\n\s*setDraft\(\(prev: EditDraft \| null\) => \(prev \? \{ \.\.\.prev, emoji: value \} : prev\)\)\n\s*\}/, 
  "onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, emoji: e.target.value } : prev))}");

content = content.replace(/onChangeText=\{\(value: string\) =>\n\s*setDraft\(\(prev: EditDraft \| null\) => \(prev \? \{ \.\.\.prev, title: value \} : prev\)\)\n\s*\}/, 
  "onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, title: e.target.value } : prev))}");

content = content.replace(/onSubmitEditing=\{/g, 'onKeyDown={(e) => { if (e.key === "Enter") ');
content = content.replace(/returnKeyType="done"\n\s*\/>/g, '/> }');

// We have one onSubmitEditing:
// onSubmitEditing={() => void handleAddFavorite()}
// returnKeyType="done"
// />
// Need to handle this manually:
content = content.replace(/onKeyDown=\{\(e\) => \{ if \(e\.key === "Enter"\) \(\) => void handleAddFavorite\(\)\}\n\s*\/> \}/, 
  'onKeyDown={(e) => { if (e.key === "Enter") { void handleAddFavorite(); } }} />');

fs.writeFileSync('src/components/ItineraryTab.tsx', content);
console.log('Fixed ItineraryTab.tsx');
