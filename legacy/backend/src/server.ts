import cors, { type CorsOptions } from "cors";
import dotenv from "dotenv";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { type Server } from "http";
import { MongoClient } from "mongodb";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ZodError, z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

type StatusCheckDocument = {
  id: string;
  client_name: string;
  timestamp: string | Date;
};

type StatusCheckResponse = {
  id: string;
  client_name: string;
  timestamp: string;
};

const statusCheckCreateSchema = z.object({
  client_name: z.string().min(1),
});

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPort(value: string | undefined): number {
  if (!value) {
    return 8000;
  }

  const parsedPort = Number.parseInt(value, 10);

  if (Number.isNaN(parsedPort) || parsedPort <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsedPort;
}

function getCorsOptions(originsValue: string | undefined): CorsOptions {
  const allowedOrigins = (originsValue ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.includes("*")) {
    return {
      origin: true,
      credentials: true,
    };
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  };
}

function toStatusCheckResponse(
  document: StatusCheckDocument,
): StatusCheckResponse {
  return {
    id: document.id,
    client_name: document.client_name,
    timestamp:
      typeof document.timestamp === "string"
        ? document.timestamp
        : document.timestamp.toISOString(),
  };
}

const mongoClient = new MongoClient(getRequiredEnv("MONGO_URL"));
const database = mongoClient.db(getRequiredEnv("DB_NAME"));
const statusChecksCollection = database.collection<StatusCheckDocument>(
  "status_checks",
);
const port = getPort(process.env.PORT);

const app = express();

app.use(cors(getCorsOptions(process.env.CORS_ORIGINS)));
app.use(express.json());

app.get("/api/", (_request: Request, response: Response) => {
  response.json({ message: "Hello World" });
});

app.post(
  "/api/status",
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = statusCheckCreateSchema.parse(request.body);
      const statusCheck: StatusCheckResponse = {
        id: uuidv4(),
        client_name: input.client_name,
        timestamp: new Date().toISOString(),
      };

      await statusChecksCollection.insertOne(statusCheck);
      response.json(statusCheck);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/status",
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const statusChecks = await statusChecksCollection
        .find({}, { projection: { _id: 0 } })
        .limit(1000)
        .toArray();

      response.json(statusChecks.map(toStatusCheckResponse));
    } catch (error) {
      next(error);
    }
  },
);

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({ detail: error.flatten() });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "message" in error &&
      error.message.includes("JSON")
    ) {
      response.status(400).json({ detail: "Invalid JSON body" });
      return;
    }

    console.error("Unhandled server error", error);
    response.status(500).json({ detail: "Internal Server Error" });
  },
);

let server: Server | undefined;

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received, shutting down backend`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await mongoClient.close();
}

async function startServer(): Promise<void> {
  await mongoClient.connect();
  console.info("Connected to MongoDB");

  server = app.listen(port, () => {
    console.info(`Backend listening on port ${port}`);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Failed to shut down cleanly", error);
      process.exit(1);
    });
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Failed to shut down cleanly", error);
      process.exit(1);
    });
});

void startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
