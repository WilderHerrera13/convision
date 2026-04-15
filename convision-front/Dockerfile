FROM node:18-bullseye

RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

EXPOSE 4300

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
