import { faker } from "@faker-js/faker";

export function generateProduct() {
  return {
    sku: `SKU-${faker.string.uuid()}`,
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    category: faker.commerce.department(),
    price: faker.commerce.price({
      min: 5,
      max: 5000,
      dec: 2
    }),
    stock: faker.number.int({
      min: 0,
      max: 500
    }),
    minStock: faker.number.int({
      min: 5,
      max: 30
    })
  };
}
