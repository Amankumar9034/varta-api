import { IsEmail, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {

  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(4)
  @MaxLength(10)
  password!: string;

  @IsOptional()
  platform!: string;
}