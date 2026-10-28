export function shortName(name: string) { return name.replace(/^Подарункова іграшка\s*/i, '').replace(/^Іграшка м'яконабивна\s*/i, '').replace(/["«»]/g, ''); }
