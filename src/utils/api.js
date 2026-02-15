import configService from '../services/configService.js';

export async function fetchProducts() {
  return await configService.fetchData();
}
