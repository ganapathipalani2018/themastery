import { Pool } from 'pg';
import { dbConfig } from './config/environment';

const pool = new Pool(dbConfig);

export default pool;
