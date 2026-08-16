FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port (Render/Docker inject PORT; default local is 4000)
EXPOSE 4000

CMD ["npm", "start"]
