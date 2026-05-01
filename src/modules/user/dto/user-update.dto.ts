import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUrl,
  IsIn,
} from 'class-validator';

class AddressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  district?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city?: string;
}

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscore',
  })
  userName?: string;

  @IsOptional()
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be 10 digits',
  })
  mobileNo?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'], {
    message: 'Gender must be male, female or other',
  })
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  address?: AddressDto;
}