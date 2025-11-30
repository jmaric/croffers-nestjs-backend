import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  SUPPORTED_VERSIONS,
  VERSION_CHANGELOG,
  getLatestVersion,
} from '../config/versioning.config.js';

@ApiTags('Version')
@Controller('api/version')
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: 200,
    description: 'Returns API version information',
    schema: {
      example: {
        currentVersion: '2',
        supportedVersions: ['1', '2'],
        latestVersion: '2',
        deprecatedVersions: [],
        versionPrefix: 'api/v',
      },
    },
  })
  getVersionInfo() {
    return {
      currentVersion: getLatestVersion(),
      supportedVersions: SUPPORTED_VERSIONS,
      latestVersion: getLatestVersion(),
      deprecatedVersions: [], // Add versions here when you deprecate them
      versionPrefix: 'api/v',
      endpoints: {
        v1: '/api/v1',
        v2: '/api/v2',
      },
    };
  }

  @Get('changelog')
  @ApiOperation({ summary: 'Get API version changelog' })
  @ApiResponse({
    status: 200,
    description: 'Returns version changelog with release notes',
  })
  getChangelog() {
    return {
      versions: VERSION_CHANGELOG,
    };
  }
}
