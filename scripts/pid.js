class PID {
    constructor(p, i, d, mi, mo) {
        this.kp = p;
        this.ki = i;
        this.kd = d;
        this.maxInt = mi;
        this.maxOut = mo;
        this.error = 0;
        this.lastError = 0;
        this.integral = 0;
        this.output = 0;
    }

    limit(value, min, max) {
        return (value < min) ? min : (value > max ? max : value);
    }

    calc(ref, fdb) {
        this.lastError = this.error;
        this.error = ref - fdb;
        var pErr = this.error * this.kp;
        var dErr = (this.error - this.lastError) * this.kd;

        switch (3) {
            // 正常积分
            case 0: {
                this.integral += this.ki * this.error;
                this.integral = this.limit(this.integral, -this.maxInt, this.maxInt);
                break;
            }
            // 积分遇限消弱法(clamping)
            // 实测效果没发现太好 因为积分起作用太快了
            case 1: {
                if ((Math.abs(this.output) >= this.maxOut) && (this.output * this.error >= 0)) {
                    this.integral = 0;
                } else {
                    this.integral += this.ki * this.error;
                    this.integral = this.limit(this.integral, -this.maxInt, this.maxInt);
                }
                break;
            }
            // 积分分离
            // 实测效果好了不少 但是积分调节过程中 动态改变了ki会导致抖动一下
            case 2: {
                // 与target相差多少开始启用积分
                // 值太大会退化成积分限幅
                // 值太小会导致积分失效
                const e = 100;
                if (Math.abs(this.error) <= e) {
                    this.integral += this.ki * this.error;
                    this.integral = this.limit(this.integral, -this.maxInt, this.maxInt);
                } else {
                    this.integral = 0;
                }
                break;
            }
            // 反馈抑制抗饱和（back-calculation）
            // 过调能减弱一些 能更加提前清空积分
            case 3: {
                let kb = this.ki / this.kp;
                this.integral += this.ki * this.error;
                this.integral += kb * (this.error - this.lastError);
                this.integral = this.limit(this.integral, -this.maxInt, this.maxInt);
                break;
            }
        }

        var sumErr = pErr + dErr + this.integral;
        this.output = this.limit(sumErr, -this.maxOut, this.maxOut);
    }

    clear() {
        this.error = this.lastError = this.integral = this.output = 0;
    }
}

class CascadePID {
    constructor(inParams, outParams) {
        this.inner = new PID(inParams[0], inParams[1], inParams[2], inParams[3], inParams[4]);
        this.outer = new PID(outParams[0], outParams[1], outParams[2], outParams[3], outParams[4])
        this.output = 0;
    }

    calc(outRef, outFdb, inFdb) {
        this.outer.calc(outRef, outFdb);
        this.inner.calc(this.outer.output, inFdb);
        this.output = this.inner.output;
    }

    clear() {
        this.inner.clear();
        this.outer.clear();
    }
}
