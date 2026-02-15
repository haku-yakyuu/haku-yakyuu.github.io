import configService from '../services/configService';

export async function fetchProducts() {
  return await configService.fetchData();
}
