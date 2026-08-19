FROM node:26

WORKDIR /app

RUN npm install -g pnpm@10.16.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "dev"]
