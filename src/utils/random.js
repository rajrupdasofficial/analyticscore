export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomItem(array) {
  if (!array || array.length === 0) return null;
  return array[randomNumber(0, array.length - 1)];
}

export function randomWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let value = Math.random() * total;

  for (const item of items) {
    value -= item.weight;
    if (value < 0) return item.value;
  }

  return items[items.length - 1].value;
}
