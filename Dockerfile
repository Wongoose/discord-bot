FROM node:alpine

WORKDIR /usr/app
COPY package.json .
COPY src src

RUN npm install --production

CMD ["npm", "start"]