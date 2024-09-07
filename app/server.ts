import express, {
    Express,
    NextFunction,
    Request,
    Response
} from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { PoolClient } from "pg";
import httpErrors from "http-errors";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import morgan from "morgan"
import { fileURLToPath } from "url";
import { pool } from "./utils/database/db";
import { AllRoutes } from "./router/router";

interface ErrorMessage {
    status: number;
    statusCode: number;
    message: string;
}

class Application {
    #app: Express;
    #Port: Number;
    constructor(port: number) {
        this.#Port = port;
        this.#app = express();

    }


    configApplication() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.#app.use(morgan("dev"));
        this.#app.use(cors());
        this.#app.use(express.urlencoded({ extended: true }));
        this.#app.use(express.json());
        this.#app.use(express.static(path.join(__dirname, "..", "public")));
        this.#app.use("/api-doc", swaggerUi.serve, swaggerUi.setup(swaggerJSDoc({
            swaggerDefinition: {
                openapi: "3.0.0",
                info: {
                    title: "winbash",
                    version: "1.0.0",
                    description: "اولین مرجع خرید و فروش به وسیله قرعه کشی توسط کاربران",
                    contact: {
                        name: "aryan salemabadi",
                        url: "http://localhost:5000",
                        email: "aryansab80@gmail.com"
                    }
                },
                servers: [
                    {
                        url: "http://localhost:5000",
                    }
                ],
                components: {
                    securitySchemes: {
                        BearerAuth: {
                            type: "http",
                            scheme: "bearer",
                            bearerFormat: "JWT"
                        }
                    }
                },
                security: {
                    BearerAuth: []
                }
            },
            apis: ["./app/router/**/*.ts"],
        }),
            {
                explorer: true,
            }
        ))

    };

    createServer() {
        http.createServer(this.#app).listen(this.#Port, () => {
            console.log(`run > http://localhost:${this.#Port}`);

        });
    };

    async connectToPgDB() {
        let client: PoolClient | undefined;
        try {
            client = await pool.connect();
            console.log("Connected tp PostgreSQL");

            process.on("SIGINT", async () => {
                await pool.end();

                console.log("Disconnected from PostgreSQL!");
                process.exit(0);
            })
        } catch (err) {
            console.log("Could't connect to PostgreSQL", err);
        } finally {
            if (client) client.release();
        }
    };

    createRoutes() {
        this.#app.use(AllRoutes)
    };

    errorHanling() {
        this.#app.use((error: ErrorMessage, req: Request, res: Response, next: NextFunction) => {
            const serverError = httpErrors.InternalServerError();
            const statusCode = error.status || serverError.statusCode;
            const message = error.message || serverError.message;

            return res.status(statusCode).json({
                statusCode,
                error: {
                    message,
                }
            })
        })
    };


}


export default Application;