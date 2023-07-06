import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const { DATABASE_URL } = process.env;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT version()');
    console.log(res.rows[0]);

    const data = {
        "world_id": "1",
        "cid": "bafybeiby6a3duj2inzeo5wdrmdacd734ckp5zz3wdx7e77uyikqtigvwnq",
        "filename": "test.ply",
        "new_col": 123,
        "object": {
          "type": "environment",
          "position": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "scale": {
            "x": 1,
            "y": 1,
            "z": 1
          }
        }
      };
      
      const text = 'INSERT INTO objects(world_id, cid, filename, object) VALUES($1, $2, $3, $4)';
      const values = [data.world_id, data.cid, data.filename, data.object];
      
      client.query(text, values, (err, res) => {
        if (err) {
          console.log(err.stack);
        } else {
          console.log('inserted');
        }
      });
  } finally {
    client.release();
  }
}

getPostgresVersion();

/*
{
    "world_id": "1",
    "cid": bafybeiby6a3duj2inzeo5wdrmdacd734ckp5zz3wdx7e77uyikqtigvwnq
    "filename": "test.ply",
    "object": {
        "type": "environment",
        "position": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "scale": {
            "x": 1,
            "y": 1,
            "z": 1
        }
    }
}
*/
