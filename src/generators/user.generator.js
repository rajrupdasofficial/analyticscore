import { faker } from "@faker-js/faker";

export function generateUser() {
  const uniqueId = faker.string.uuid();

  return {
    name: faker.person.fullName(),
    email: `customer-${uniqueId}@example.test`,
    phone: faker.phone.number()
  };
}
