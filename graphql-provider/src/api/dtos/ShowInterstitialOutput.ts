import { IntersectionType, ObjectType } from '@nestjs/graphql';

import { StaticLwpInterstitial } from '../entities/static_lwp_interstitial';
import { LwpUserInterstitialOutput } from './LwpUserInterstitialOutput';

@ObjectType()
export class ShowInterstitialOutput extends IntersectionType(LwpUserInterstitialOutput, StaticLwpInterstitial) {}
