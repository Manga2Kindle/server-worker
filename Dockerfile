FROM ubuntu:20.04
WORKDIR /usr/src/app

# set non interactive variable
ARG DEBIAN_FRONTEND=noninteractive

# update and upgrade
RUN apt-get update && apt-get upgrade -y

# install node
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_lts.x | bash -
RUN apt-get install -y nodejs

# install typescript
RUN apt-get install -y node-typescript

# install python3
RUN apt-get install -y python3 python3-pip

# copy package and install
COPY package.json package*.json ./
RUN npm install

# copy the app
COPY . .

# install kcc requirements
RUN pip3 install -r kcc-master/requirements.txt

# build typescript
RUN cd lib && tsc

# remove not needed npm packages
# RUN npm ci --only=production

# remove not needed typescript files
RUN apt-get remove -y node-typescript

# clean things
RUN apt-get clean && rm -rf /var/lib/apt/lists/*



EXPOSE 8080

CMD ["./run.sh"]
