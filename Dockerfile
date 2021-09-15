FROM node:16.9.1-alpine

WORKDIR /usr/app
COPY ./package.json /usr/app/package.json
COPY ./src /usr/app/src

RUN npm install

CMD ["npm", "start"]
