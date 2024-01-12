const pokeapi_key = 'https://pokeapi.co/api/v2/pokemon/pikachu'
const pokeapi = fetch(pokeapi_key)
  .then(res => res.json())
  .then(res => console.log(res))
console.log(pokeapi)
