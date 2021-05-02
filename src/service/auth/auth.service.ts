import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordEncryptionService } from '../../auth/password-encryption/password-encryption.service';
import { Constants } from 'src/model/constants';
import { BusinessException } from 'src/model/business-exception';
import { AuthToken } from 'src/auth/auth-token';
import { ResponseObject } from 'src/model/response-object';
import { BusinessError } from 'src/model/business-error';
// import { VendorRepository } from 'src/repository/vendor-repository';
// import { EmployeeRepository } from 'src/repository/employee.repository';
// import { DriverRepository } from 'src/repository/driver-repository';
import { RestCallService } from '../rest-call/rest-call.service';

@Injectable()
export class AuthService {

    constructor(
        private usersService: UserService,
        private jwtService: JwtService,
        private passwordEncryptionService: PasswordEncryptionService,
        private restCallService: RestCallService
    ) {

    }


    async validateUser(username: string, pass: string): Promise<ResponseObject<{}>> {
        const user = await this.usersService.findByUserName(username);
        if (user && this.passwordEncryptionService.decrypt(user.password) === pass) {
            const payload = { userName: user.userName, sub: user.id };
            let map = {};
            map["token"] = new AuthToken(this.jwtService.sign(payload));
            user.password = "";
            map["user"] = user;

            if (user.type === "CUSTOMER") {
                // let customer = await this.customerRepository.findOne({ where: "(user_mst_id) = ('" + user.id + "')" });
                let customer = await this.restCallService.findCustomerByUserId(map["token"].token, user.id);
                map['customerId'] = customer.id;
            }
            let be: BusinessError = new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES);
            let ro: ResponseObject<{}> = new ResponseObject(be, map);


            return ro;
        } else {
            throw new BusinessException(Constants.FAILURE_CODE, Constants.INVALID_CREDENTIALS);
        }

    }



    async login(username: string, password: string): Promise<ResponseObject<{}>> {
        return await this.validateUser(username, password);
    }

    validateToken(token: string, payloadReq: any): ResponseObject<{}> {

        const payload = { userName: payloadReq.userName, sub: payloadReq.userId };
        let map = {};
        map["refteshToken"] = new AuthToken(this.jwtService.sign(payload)).token;
        map["payload"] = payloadReq;

        let be: BusinessError = new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES);
        let ro: ResponseObject<{}> = new ResponseObject(be, map);
        ro.refreshToken = map["refteshToken"];
        ro.res = payloadReq;
        return ro;

    }

    async generateOtp(contactNo: string): Promise<ResponseObject<{}>> {
        const user = await this.usersService.findByContactNumber(contactNo);
        if (user) {
            // zelle
            let map = {};
            const otp = Math.floor(1000 + Math.random() * 9000);
            map['otp'] = otp;
            map['type'] = user.type;

            if (user.type === "VENDOR") {
                //  let vendor = await this.vendorRepository.findOne({ where: "(user_mst_id) = ('" + user.id + "')" });
                let vendor = await this.restCallService.findVendorByUserId(user.id);
                map['vendorId'] = vendor.id;
            } else if (user.type === "EMPLOYEE") {
                //  let employee = await this.employeeRepository.findOne({ where: "(user_mst_id) = ('" + user.id + "')" });
                let employee = await this.restCallService.findEmployeeByUserId(user.id);
                map['employeeId'] = employee.id;
            } else if (user.type === "DRIVER") {
                // let driver = await this.driverRepository.findOne({ where: "(user_mst_id) = ('" + user.id + "')" });
                let driver = await this.restCallService.findDriverByUserId(user.id);
                map['driverId'] = driver.id;
            }

            let be: BusinessError = new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES);
            let ro: ResponseObject<{}> = new ResponseObject(be, map);
            return ro;
        } else {
            throw new BusinessException(Constants.FAILURE_CODE, Constants.INVALID_CREDENTIALS);
        }
    }

    async forgotPasswordLinkGenerate(email: string): Promise<ResponseObject<{}>> {
        let url = await this.usersService.forgotPasswordLinkGenerate(email);
        let ro = new ResponseObject(new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES), { link: url })
        return ro;
    }

    async validateForgotPasswordToken(token: string): Promise<ResponseObject<{}>> {
        let user = await this.usersService.findByForgotPasswordToken(token);
        let ro = new ResponseObject(new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES), { uesrId: user.id });
        return ro;
    }

    async changePassword(token: string, oldPassword: string, newPassword): Promise<ResponseObject<{}>> {
        await this.usersService.changePassword(token, oldPassword, newPassword);
        let ro = new ResponseObject(new BusinessError(Constants.SUCCESS_CODE, Constants.SUCCESS_RES), {});
        return ro;
    }

}
