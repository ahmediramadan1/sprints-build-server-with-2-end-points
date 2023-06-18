import fetch from "node-fetch";
import http from "http";
import url from "url";
import path from "path";
import joi from "joi";
import fs from "fs";

const server = http.createServer((request, response) => {
  const { query, pathname } = url.parse(request.url, true);

  if (pathname === "/products" && request.method === "GET") {
    const products = async () => {
      try {
        const [productsResponse, exchangeRateResponse] = await Promise.all([
          fetch("https://api.escuelajs.co/api/v1/products?offset=1&limit=3"),
          fetch(`https://api.exchangerate.host/convert?from=USD&to=${query.CUR}`),
        ]);

        if (!productsResponse.ok || !exchangeRateResponse.ok) {
          throw new Error("Unable to fetch data from API");
        }

        const productsData = await productsResponse.json();
        const exchangeRateData = await exchangeRateResponse.json();

        const conversionRate = exchangeRateData.result;

        const transformedProducts = productsData.reduce((acc, product) => {
          if (!acc[product.category?.id]) {
            acc[product.category?.id] = {
              category: {
                id: product.category?.id,
                name: product.category?.name,
              },
              products: [],
            };
          }

          const transformedProduct = {
            ...product,
            price: product.price * conversionRate,
          };
          acc[product.category?.id].products.push(transformedProduct);

          return acc;
        }, {});

        response.end(JSON.stringify(Object.values(transformedProducts), null, 2));
      } catch (error) {
        console.log(error);
      }
    };

    products();
  } else if (pathname == "/products" && request.method === "POST") {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const schema = joi.object({
          name: joi.string().required(),
          category: joi.string().required(),
          price: joi.number().required(),
        });

        const product = JSON.parse(chunks.toString());
        const validatedProduct = schema.validateSync(product, { strict: true });

        response.setHeader("Content-Type", "application/json");
        response.writeHead(200);
        response.write(JSON.stringify(validatedProduct));
        response.end();
      } catch (error) {
        response.writeHead(404);
        response.end();
      }
    });

    request.on("error", (error) => {
      response.setHeader("Content-Type", "text");
      response.writeHead(404);
      response.write(error.message);
      response.end();
    });
  } else {
    response.end("Error!");
  }
});

server.listen(8080, "127.0.0.1", () => {
  console.log("Converting from USD ...");
});
