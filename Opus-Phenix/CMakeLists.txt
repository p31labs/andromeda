# Opus Phenix - Root CMake Configuration
# Waveshare ESP32-S3 Touch LCD 3.5" Type B

cmake_minimum_required(VERSION 3.16)

# Set target chip
set(IDF_TARGET esp32s3)

# Include ESP-IDF CMake
include($ENV{IDF_PATH}/tools/cmake/project.cmake)

# Project name
project(opus_phenix)

