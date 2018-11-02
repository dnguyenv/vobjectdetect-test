FROM node:8
ENV PORT=3000\
    LIFE_TIME=1800000
#  IMG_SRC_DIR 'img-src'\
#  IMG_TEST_DIR img-test\
COPY . /app
WORKDIR /app 
RUN npm i
ENTRYPOINT [ "/bin/bash","-c","node ." ] 