export function tally(round) {
  const counts = round.options.map(() => 0);
  for (const vote of Object.values(round.votes || {})) {
    if (Number.isInteger(vote) && vote >= 0 && vote < counts.length) counts[vote]++;
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  const max = Math.max(...counts);
  return { counts, total, leaders: counts.map((count, index) => count === max ? index : -1).filter(index => index >= 0) };
}
