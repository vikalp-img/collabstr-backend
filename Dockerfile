FROM node:22-alpine


WORKDIR /home/collab

COPY package*.json ./

RUN npm install

COPY . .


EXPOSE 5005

CMD ["npm", "start"]
