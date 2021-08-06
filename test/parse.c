// this is a reference implementation of parsing, in C
// eventually it may be compiled for wasm
// gcc test/parse.c -o testparse

// http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol
// I had some errors I fixed, then structured it for my own code


#include <stdio.h>
 
#define SYNC   0xAA
#define EXCODE 0x55
#define RAW_16BIT 0x80

int parsePayload( unsigned char *payload, unsigned char pLength ) {
    unsigned char bytesParsed = 0;
    unsigned char code;
    unsigned char length;
    unsigned char extendedCodeLevel;
    int i;
 
    // Loop until all bytes are parsed from the payload[] array... */
    while ( bytesParsed < pLength ) {
      // Parse the extendedCodeLevel, code, and length */
      extendedCodeLevel = 0;
      while ( payload[bytesParsed] == EXCODE ) {
        extendedCodeLevel++;
        bytesParsed++;
      }
      code = payload[bytesParsed++];
      
      if ( code & RAW_16BIT ) {
        length = payload[bytesParsed++];
      } else {
        length = 1;
      }

      // use extendedCodeLevel, code, payload & length to handle data
      printf( "EXCODE level: %d CODE: 0x%02X length: %d DATA: ", extendedCodeLevel, code, length );
      for ( i=0; i<length; i++ ) {
        printf( " %02X", payload[bytesParsed+i] & 0xFF );
      }
      printf( "\n" );

      // Increment the bytesParsed by the length of the Data Value */
      bytesParsed += length;
    }
 
    return( 0 );
}

// Compute [PAYLOAD...] chksum
int getChecksum (unsigned char payload[256], unsigned char pLength) {
  int checksum = 0;
  unsigned char i;
  
  for ( i=0; i<pLength; i++ ) {
    checksum += payload[i];
  }
  
  checksum &= 0xFF;
  checksum = ~checksum & 0xFF;
  return checksum;
}
 
int main( int argc, char **argv ) {
    unsigned char payload[256];
    unsigned char pLength;
    unsigned char c;

    FILE *stream = 0;

    if (argc == 1) {
      printf("Usage: testparse <INPUT>\n");
      return 1;
    }

    printf("Opening %s for parsing.", argv[1]);
    
    stream = fopen( argv[1], "r" );

    // Loop forever, parsing one Packet per loop...
    while ( 1 ) {
      // Synchronize on 2 [SYNC] bytes
      fread( &c, 1, 1, stream );
      if ( c != SYNC ) {
        continue;
      }
      fread( &c, 1, 1, stream );
      if ( c != SYNC ) {
        continue;
      }

      // Parse [PLENGTH] byte
      while ( 1 ) {
        fread( &pLength, 1, 1, stream );
        if( pLength != 170 ) {
          break;
        }
      }
      
      if ( pLength > 169 ) {
        continue;
      }

      // Collect [PAYLOAD...] bytes
      fread( payload, 1, pLength, stream );

      // Parse [CKSUM] byte */
      fread( &c, 1, 1, stream );

      // Verify [PAYLOAD...] chksum against [CKSUM] */
      if ( c != getChecksum(payload, pLength) ) {
        // printf( "checksum fail: %02X != %02X\n", checksum, c );
        continue;
      }

      // Since [CKSUM] is OK, parse the Data Payload */
      parsePayload( payload, pLength );
    }
 
    return 0;
}
