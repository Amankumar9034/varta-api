import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class LoginUserDto {

  @IsEmail()
  email!: string;

  @MinLength(4)
  @MaxLength(10)
  password!: string;
}