import planets from './data/planets.json';
import './style.css';

const container = document.querySelector('#planets');
for (const planet of planets) {
  const card = document.createElement('article');
  const heading = document.createElement('h2');
  heading.textContent = `${planet.orderFromSun}. ${planet.name}`;
  card.append(heading);
  for (const fact of planet.facts) {
    const paragraph = document.createElement('p');
    paragraph.textContent = fact.text;
    const source = document.createElement('a');
    source.href = `https://github.com/Harrisonxaph/Cosmos-quest/blob/main/docs/SCIENCE.md#${fact.sourceId}`;
    source.textContent = 'Science source';
    card.append(paragraph, source);
  }
  container.append(card);
}
