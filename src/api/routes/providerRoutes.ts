import { FastifyInstance } from 'fastify';
import { DataProviderRepository } from '../../dal/repositories/DataProviderRepository.ts';

const dataProviderRepository = new DataProviderRepository();

export async function providerRoutes(application: FastifyInstance) {
  application.get('/', async () => {
    return dataProviderRepository.findAll();
  });

  application.get('/:name', async (request: any, reply) => {
    const { name } = request.params;
    const provider = await dataProviderRepository.findByName(name);
    if (!provider) return reply.status(404).send({ error: 'Provider not found' });
    return provider;
  });
}
